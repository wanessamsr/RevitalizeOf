import { Router } from 'express';
import { Prisma, Role } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../db.js';
import { recordAudit } from '../audit.js';
import { currentUser, generateTemporaryPassword, hashPassword, requireRole, revokeUserSessions } from '../auth.js';
import { HttpError, emailSchema, idParam, parseInput } from '../http.js';
import { ADMIN_ROLES } from '../roles.js';

// Administração de contas: somente o perfil ADMIN.
export const usersRouter = Router();

usersRouter.use(requireRole(ADMIN_ROLES));

const roleSchema = z.enum(Role, { error: 'Perfil inválido' });

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  mustChangePassword: true,
  lockedUntil: true,
  lastLoginAt: true,
  createdAt: true,
} satisfies Prisma.UserSelect;

usersRouter.get('/', async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' }, select: userSelect });
  await recordAudit(req, { action: 'LIST', entity: 'User' });
  res.json(users);
});

const createUserSchema = z.object({
  name: z.string({ error: 'Informe o nome' }).trim().min(3, { error: 'Informe o nome completo' }).max(150),
  email: emailSchema,
  role: roleSchema,
});

// Cria a conta com senha temporária, mostrada uma única vez ao administrador.
usersRouter.post('/', async (req, res) => {
  const input = parseInput(createUserSchema, req.body);

  const exists = await prisma.user.findUnique({ where: { email: input.email }, select: { id: true } });
  if (exists) throw new HttpError(409, 'Já existe uma conta com este e-mail.', 'USER_EXISTS', { email: 'E-mail já cadastrado' });

  const temporaryPassword = generateTemporaryPassword();
  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      role: input.role,
      password: await hashPassword(temporaryPassword),
      mustChangePassword: true,
    },
    select: userSelect,
  });

  await recordAudit(req, { action: 'CREATE', entity: 'User', entityId: user.id, details: `perfil ${user.role}` });
  res.status(201).json({ user, temporaryPassword });
});

const updateUserSchema = z
  .object({
    name: z.string().trim().min(3).max(150).optional(),
    role: roleSchema.optional(),
    active: z.boolean().optional(),
    unlock: z.literal(true).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { error: 'Nada para alterar' });

usersRouter.patch('/:id', async (req, res) => {
  const admin = currentUser(req);
  const { id } = parseInput(idParam, req.params);
  const input = parseInput(updateUserSchema, req.body);

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true, active: true } });
  if (!target) throw new HttpError(404, 'Usuário não encontrado', 'NOT_FOUND');

  if (id === admin.id && (input.active === false || (input.role && input.role !== 'ADMIN'))) {
    throw new HttpError(400, 'Você não pode desativar nem tirar o perfil de administrador da sua própria conta.', 'SELF_LOCKOUT');
  }

  const data: Prisma.UserUpdateInput = {};
  const changes: string[] = [];
  if (input.name !== undefined) {
    data.name = input.name;
    changes.push('nome');
  }
  if (input.role !== undefined && input.role !== target.role) {
    data.role = input.role;
    changes.push(`perfil ${target.role} para ${input.role}`);
  }
  if (input.active !== undefined && input.active !== target.active) {
    data.active = input.active;
    changes.push(input.active ? 'reativada' : 'desativada');
  }
  if (input.unlock) {
    data.lockedUntil = null;
    data.failedLoginCount = 0;
    changes.push('desbloqueada');
  }

  const user = await prisma.user.update({ where: { id }, data, select: userSelect });

  // Mudança de perfil ou desativação encerra as sessões abertas da conta.
  if (data.role !== undefined || data.active === false) await revokeUserSessions(id);

  await recordAudit(req, { action: 'UPDATE', entity: 'User', entityId: id, details: changes.join(', ') || 'sem alteração' });
  res.json(user);
});

usersRouter.post('/:id/reset-password', async (req, res) => {
  const { id } = parseInput(idParam, req.params);

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true } });
  if (!target) throw new HttpError(404, 'Usuário não encontrado', 'NOT_FOUND');

  const temporaryPassword = generateTemporaryPassword();
  const user = await prisma.user.update({
    where: { id },
    data: {
      password: await hashPassword(temporaryPassword),
      mustChangePassword: true,
      failedLoginCount: 0,
      lockedUntil: null,
    },
    select: userSelect,
  });
  await revokeUserSessions(id);

  await recordAudit(req, { action: 'PASSWORD_RESET', entity: 'User', entityId: id });
  res.json({ user, temporaryPassword });
});

// ---------- Consulta da trilha de auditoria (somente leitura) ----------

export const auditRouter = Router();

auditRouter.use(requireRole(ADMIN_ROLES));

const auditQuerySchema = z.object({
  entityId: z.string().trim().max(64).optional(),
  userId: z.uuid().optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
});

const AUDIT_PAGE_SIZE = 50;

auditRouter.get('/', async (req, res) => {
  const { entityId, userId, page } = parseInput(auditQuerySchema, req.query);

  const where: Prisma.AuditLogWhereInput = {};
  if (entityId) where.entityId = entityId;
  if (userId) where.userId = userId;

  const [total, items] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
      select: {
        id: true,
        action: true,
        entity: true,
        entityId: true,
        details: true,
        ip: true,
        createdAt: true,
        user: { select: { id: true, name: true, role: true } },
      },
    }),
  ]);

  await recordAudit(req, { action: 'VIEW', entity: 'AuditLog', details: `página ${page}` });
  res.json({ items, total, page, pageSize: AUDIT_PAGE_SIZE });
});
