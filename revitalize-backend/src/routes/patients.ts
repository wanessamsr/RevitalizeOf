import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { recordAudit } from '../audit.js';
import { currentUser, requireRole } from '../auth.js';
import { HttpError, cpfSchema, dateOnlySchema, formatCpf, idParam, maskCpf, onlyDigits, parseInput } from '../http.js';
import { PATIENT_ROLES } from '../roles.js';

export const patientsRouter = Router();

patientsRouter.use(requireRole(PATIENT_ROLES));

const PAGE_SIZE = 50;

const listQuerySchema = z.object({
  search: z.string().trim().max(150).optional(),
  status: z.enum(['ATIVO', 'EM_CRISE', 'INATIVO']).optional(),
  page: z.coerce.number().int().min(1).max(10000).default(1),
});

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

// Lista paginada. O CPF vem mascarado; a busca por CPF exige os 11 dígitos.
patientsRouter.get('/', async (req, res) => {
  const { search, status, page } = parseInput(listQuerySchema, req.query);

  const where: Prisma.PatientWhereInput = {};
  if (status) where.status = status;
  if (search) {
    const digits = onlyDigits(search);
    where.OR = digits.length === 11 ? [{ cpf: digits }] : [{ fullName: { contains: search } }, { socialName: { contains: search } }];
  }

  const [total, patients] = await prisma.$transaction([
    prisma.patient.count({ where }),
    prisma.patient.findMany({
      where,
      orderBy: { fullName: 'asc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { id: true, fullName: true, socialName: true, cpf: true, birthDate: true, status: true, createdAt: true },
    }),
  ]);

  await recordAudit(req, {
    action: 'LIST',
    entity: 'Patient',
    details: `página ${page}${search ? ', com busca' : ''}${status ? `, status ${status}` : ''}`,
  });

  res.json({
    items: patients.map((patient) => ({
      ...patient,
      cpf: maskCpf(patient.cpf),
      birthDate: toDateOnly(patient.birthDate),
    })),
    total,
    page,
    pageSize: PAGE_SIZE,
  });
});

patientsRouter.get('/:id', async (req, res) => {
  const { id } = parseInput(idParam, req.params);

  const patient = await prisma.patient.findUnique({
    where: { id },
    select: {
      id: true,
      fullName: true,
      socialName: true,
      cpf: true,
      birthDate: true,
      status: true,
      createdAt: true,
      admissions: {
        orderBy: { date: 'desc' },
        take: 1,
        select: { id: true, type: true, date: true, author: { select: { name: true, role: true } } },
      },
    },
  });

  if (!patient) throw new HttpError(404, 'Paciente não encontrado', 'NOT_FOUND');

  await recordAudit(req, { action: 'VIEW', entity: 'Patient', entityId: patient.id });

  const { admissions, ...rest } = patient;
  res.json({
    ...rest,
    cpf: formatCpf(rest.cpf),
    birthDate: toDateOnly(rest.birthDate),
    lastAdmission: admissions[0] ?? null,
  });
});

const updateStatusSchema = z.object({
  status: z.enum(['ATIVO', 'EM_CRISE', 'INATIVO'], { error: 'Status inválido' }),
});

patientsRouter.patch('/:id/status', async (req, res) => {
  const { id } = parseInput(idParam, req.params);
  const { status } = parseInput(updateStatusSchema, req.body);

  const exists = await prisma.patient.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!exists) throw new HttpError(404, 'Paciente não encontrado', 'NOT_FOUND');

  const patient = await prisma.patient.update({ where: { id }, data: { status }, select: { id: true, status: true } });
  await recordAudit(req, { action: 'UPDATE', entity: 'Patient', entityId: id, details: `status ${exists.status} para ${status}` });
  res.json(patient);
});

// ---------- Acolhimento: cria o paciente e a ficha de acolhimento juntos ----------

const ADMISSION_TYPES = ['geral', 'transtorno-mental', 'alcool-drogas'] as const;

// Os demais campos da ficha chegam como lista de pares pergunta/resposta.
const admissionDetailsSchema = z
  .array(
    z.object({
      section: z.string().max(150),
      label: z.string().max(200),
      value: z.string().max(5000),
    }),
  )
  .max(400);

const admissionSchema = z.object({
  type: z.enum(ADMISSION_TYPES, { error: 'Tipo de acolhimento inválido' }),
  patient: z.object({
    fullName: z.string({ error: 'Informe o nome completo' }).trim().min(3, { error: 'Informe o nome completo' }).max(150),
    socialName: z.string().trim().max(150).optional(),
    cpf: cpfSchema,
    birthDate: dateOnlySchema.refine((date) => date.getTime() <= Date.now(), { error: 'Data de nascimento no futuro' }),
  }),
  reason: z.string({ error: 'Informe a demanda / queixa principal' }).trim().min(3, { error: 'Informe a demanda / queixa principal' }).max(5000),
  details: admissionDetailsSchema.default([]),
});

export const admissionsRouter = Router();

admissionsRouter.use(requireRole(PATIENT_ROLES));

admissionsRouter.post('/', async (req, res) => {
  const author = currentUser(req);
  const input = parseInput(admissionSchema, req.body);

  const existing = await prisma.patient.findUnique({ where: { cpf: input.patient.cpf }, select: { id: true } });
  if (existing) {
    throw new HttpError(409, 'Já existe paciente cadastrado com este CPF. Abra o prontuário existente.', 'PATIENT_EXISTS');
  }

  const { patient, admission } = await prisma.$transaction(async (tx) => {
    const createdPatient = await tx.patient.create({
      data: {
        fullName: input.patient.fullName,
        socialName: input.patient.socialName ? input.patient.socialName : null,
        cpf: input.patient.cpf,
        birthDate: input.patient.birthDate,
        createdById: author.id,
      },
      select: { id: true, fullName: true },
    });
    const createdAdmission = await tx.admission.create({
      data: {
        patientId: createdPatient.id,
        authorId: author.id,
        type: input.type,
        reason: input.reason,
        details: input.details as Prisma.InputJsonValue,
      },
      select: { id: true, date: true },
    });
    return { patient: createdPatient, admission: createdAdmission };
  });

  await recordAudit(req, { action: 'CREATE', entity: 'Patient', entityId: patient.id });
  await recordAudit(req, { action: 'CREATE', entity: 'Admission', entityId: patient.id, details: `acolhimento ${admission.id}` });

  res.status(201).json({ patientId: patient.id, admissionId: admission.id });
});
