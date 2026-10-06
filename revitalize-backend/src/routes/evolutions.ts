import { Router } from 'express';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { recordAudit } from '../audit.js';
import { currentUser, requireRole } from '../auth.js';
import { HttpError, idParam, parseInput } from '../http.js';
import { CLINICAL_ROLES, EVOLUTION_TYPE_ROLES, hasRole } from '../roles.js';

// Evoluções são imutáveis: só existem rotas de leitura, criação e adendo.
export const evolutionsRouter = Router();

// Montado em /api: o controle de perfil fica em cada rota para não afetar outras rotas.
const clinicalOnly = requireRole(CLINICAL_ROLES);

const evolutionSelect = {
  id: true,
  patientId: true,
  type: true,
  attendanceType: true,
  occurredAt: true,
  notes: true,
  details: true,
  amendsId: true,
  createdAt: true,
  author: { select: { id: true, name: true, role: true } },
} satisfies Prisma.EvolutionSelect;

async function ensurePatient(patientId: string): Promise<void> {
  const patient = await prisma.patient.findUnique({ where: { id: patientId }, select: { id: true } });
  if (!patient) throw new HttpError(404, 'Paciente não encontrado', 'NOT_FOUND');
}

// GET /api/patients/:id/evolutions
evolutionsRouter.get('/patients/:id/evolutions', clinicalOnly, async (req, res) => {
  const { id } = parseInput(idParam, req.params);
  await ensurePatient(id);

  const evolutions = await prisma.evolution.findMany({
    where: { patientId: id },
    orderBy: [{ occurredAt: 'desc' }, { createdAt: 'desc' }],
    take: 500,
    select: evolutionSelect,
  });

  await recordAudit(req, { action: 'VIEW', entity: 'Evolution', entityId: id, details: 'histórico clínico do paciente' });
  res.json(evolutions);
});

const vitalSignsSchema = z
  .object({
    bloodPressure: z.string().trim().max(20).optional(),
    heartRate: z.string().trim().max(10).optional(),
    temperature: z.string().trim().max(10).optional(),
    spo2: z.string().trim().max(10).optional(),
  })
  .optional();

const topicSchema = z.object({
  title: z.string().trim().max(150),
  content: z.string().max(10000),
  isPrivate: z.boolean(),
});

const prescriptionSchema = z.object({
  medicine: z.string().trim().max(150),
  dosage: z.string().trim().max(150),
  frequency: z.string().trim().max(150),
});

const createEvolutionSchema = z
  .object({
    type: z.enum(['MEDICA', 'ENFERMAGEM', 'MULTIPROFISSIONAL'], { error: 'Tipo de evolução inválido' }),
    attendanceType: z.enum(['Atendimento na Unidade', 'Visita Domiciliar', 'Matriciamento'], {
      error: 'Tipo de atendimento inválido',
    }),
    occurredAt: z.iso.datetime({ offset: true, error: 'Data e horário inválidos' }).transform((value) => new Date(value)),
    notes: z.string().max(20000).default(''),
    vitalSigns: vitalSignsSchema,
    topics: z.array(topicSchema).max(30).optional(),
    prescriptions: z.array(prescriptionSchema).max(30).optional(),
  })
  .refine((data) => data.occurredAt.getTime() <= Date.now() + 5 * 60 * 1000, {
    error: 'A data do atendimento não pode estar no futuro',
    path: ['occurredAt'],
  })
  .refine(
    (data) =>
      data.type === 'MULTIPROFISSIONAL'
        ? (data.topics ?? []).some((topic) => topic.content.trim().length > 0)
        : data.notes.trim().length > 0,
    { error: 'Escreva a evolução antes de salvar', path: ['notes'] },
  );

// POST /api/patients/:id/evolutions
evolutionsRouter.post('/patients/:id/evolutions', clinicalOnly, async (req, res) => {
  const author = currentUser(req);
  const { id } = parseInput(idParam, req.params);
  const input = parseInput(createEvolutionSchema, req.body);

  if (!hasRole(author.role, EVOLUTION_TYPE_ROLES[input.type])) {
    await recordAudit(req, { action: 'ACCESS_DENIED', entity: 'Evolution', entityId: id, details: `tentou registrar evolução ${input.type}` });
    throw new HttpError(403, 'Seu perfil não pode registrar este tipo de evolução.', 'FORBIDDEN');
  }

  await ensurePatient(id);

  const details: Prisma.InputJsonObject = {
    ...(input.type === 'ENFERMAGEM' && input.vitalSigns ? { vitalSigns: input.vitalSigns } : {}),
    ...(input.type === 'MULTIPROFISSIONAL' ? { topics: (input.topics ?? []).filter((topic) => topic.content.trim().length > 0) } : {}),
    ...(input.type === 'MEDICA'
      ? { prescriptions: (input.prescriptions ?? []).filter((item) => item.medicine.length > 0) }
      : {}),
  };

  const evolution = await prisma.evolution.create({
    data: {
      patientId: id,
      authorId: author.id,
      type: input.type,
      attendanceType: input.attendanceType,
      occurredAt: input.occurredAt,
      notes: input.notes.trim(),
      details,
    },
    select: evolutionSelect,
  });

  await recordAudit(req, { action: 'CREATE', entity: 'Evolution', entityId: id, details: `evolução ${evolution.id}` });
  res.status(201).json(evolution);
});

const addendumSchema = z.object({
  notes: z.string({ error: 'Escreva o adendo' }).trim().min(3, { error: 'Escreva o adendo' }).max(10000),
});

// POST /api/evolutions/:id/addenda
evolutionsRouter.post('/evolutions/:id/addenda', clinicalOnly, async (req, res) => {
  const author = currentUser(req);
  const { id } = parseInput(idParam, req.params);
  const { notes } = parseInput(addendumSchema, req.body);

  const original = await prisma.evolution.findUnique({
    where: { id },
    select: { id: true, patientId: true, type: true, amendsId: true },
  });
  if (!original) throw new HttpError(404, 'Evolução não encontrada', 'NOT_FOUND');

  // Adendo sempre aponta para a evolução original, nunca para outro adendo.
  const targetId = original.amendsId ?? original.id;

  const addendum = await prisma.evolution.create({
    data: {
      patientId: original.patientId,
      authorId: author.id,
      type: original.type,
      attendanceType: 'Adendo',
      occurredAt: new Date(),
      notes,
      amendsId: targetId,
    },
    select: evolutionSelect,
  });

  await recordAudit(req, {
    action: 'ADDENDUM',
    entity: 'Evolution',
    entityId: original.patientId,
    details: `adendo ${addendum.id} à evolução ${targetId}`,
  });
  res.status(201).json(addendum);
});
