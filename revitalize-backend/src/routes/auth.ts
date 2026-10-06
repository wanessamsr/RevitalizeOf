import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { config } from '../config.js';
import { prisma } from '../db.js';
import { recordAudit } from '../audit.js';
import {
  clearSessionCookie,
  createSession,
  currentUser,
  hashPassword,
  requireAuth,
  revokeSession,
  revokeUserSessions,
  verifyPassword,
} from '../auth.js';
import { HttpError, emailSchema, parseInput, passwordSchema } from '../http.js';

export const authRouter = Router();

// No máximo 30 tentativas ERRADAS de login a cada 15 minutos por endereço IP
// (logins certos não contam, porque toda a equipe do CAPS sai pelo mesmo IP).
// Além disso, cada conta é bloqueada após LOGIN_MAX_ATTEMPTS erros seguidos.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Muitas tentativas de login. Aguarde 15 minutos e tente novamente.', code: 'RATE_LIMIT' },
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ error: 'Informe a senha' }).min(1, { error: 'Informe a senha' }).max(200),
});

const INVALID_CREDENTIALS = 'E-mail ou senha incorretos.';

function sessionInfo(expiresAt: Date) {
  return { idleMinutes: config.session.idleMinutes, expiresAt: expiresAt.toISOString() };
}

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = parseInput(loginSchema, req.body);

  const user = await prisma.user.findUnique({ where: { email } });
  const now = new Date();

  if (user?.lockedUntil && user.lockedUntil > now) {
    await verifyPassword(password, null);
    await recordAudit(req, { action: 'LOGIN_BLOCKED', entity: 'Auth', userId: user.id });
    res.status(429).json({
      error: 'Acesso bloqueado temporariamente por excesso de tentativas. Tente mais tarde ou procure o administrador.',
      code: 'ACCOUNT_LOCKED',
    });
    return;
  }

  const passwordOk = await verifyPassword(password, user?.password ?? null);

  if (!user || !passwordOk || !user.active) {
    if (user) {
      const failures = user.failedLoginCount + 1;
      const lock = failures >= config.login.maxAttempts;
      await prisma.user.update({
        where: { id: user.id },
        data: lock
          ? { failedLoginCount: 0, lockedUntil: new Date(now.getTime() + config.login.lockMs) }
          : { failedLoginCount: failures },
      });
      await recordAudit(req, {
        action: lock ? 'LOGIN_BLOCKED' : 'LOGIN_FAIL',
        entity: 'Auth',
        userId: user.id,
        details: user.active ? null : 'conta desativada',
      });
    } else {
      await recordAudit(req, { action: 'LOGIN_FAIL', entity: 'Auth', userId: null, details: 'e-mail não cadastrado' });
    }
    res.status(401).json({ error: INVALID_CREDENTIALS, code: 'INVALID_CREDENTIALS' });
    return;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
  });

  const { expiresAt } = await createSession(req, res, user.id);
  await recordAudit(req, { action: 'LOGIN', entity: 'Auth', userId: user.id });

  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role, mustChangePassword: user.mustChangePassword },
    session: sessionInfo(expiresAt),
  });
});

authRouter.get('/me', requireAuth, (req, res) => {
  const auth = req.auth;
  if (!auth) throw new HttpError(401, 'Faça login para continuar', 'UNAUTHENTICATED');
  res.json({ user: auth.user, session: sessionInfo(auth.expiresAt) });
});

// Mantém a sessão ativa enquanto o profissional está usando a tela.
authRouter.post('/ping', requireAuth, (_req, res) => {
  res.status(204).end();
});

authRouter.post('/logout', async (req, res) => {
  const token: unknown = req.cookies?.[config.session.cookieName];
  if (typeof token === 'string' && token.length >= 20 && token.length <= 100) {
    const sessionId = createHash('sha256').update(token).digest('hex');
    const session = await prisma.session.findUnique({ where: { id: sessionId }, select: { id: true, userId: true, revokedAt: true } });
    if (session && session.revokedAt === null) {
      await revokeSession(session.id);
      await recordAudit(req, { action: 'LOGOUT', entity: 'Auth', userId: session.userId });
    }
  }
  clearSessionCookie(res);
  res.status(204).end();
});

const changePasswordSchema = z
  .object({
    currentPassword: z.string({ error: 'Informe a senha atual' }).min(1, { error: 'Informe a senha atual' }).max(200),
    newPassword: passwordSchema,
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    error: 'A nova senha deve ser diferente da atual',
    path: ['newPassword'],
  });

authRouter.post('/change-password', requireAuth, async (req, res) => {
  const sessionUser = currentUser(req);
  const { currentPassword, newPassword } = parseInput(changePasswordSchema, req.body);

  const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
  if (!user || !(await verifyPassword(currentPassword, user.password))) {
    throw new HttpError(400, 'Senha atual incorreta.', 'VALIDATION_ERROR', { currentPassword: 'Senha atual incorreta' });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      password: await hashPassword(newPassword),
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    },
    select: { id: true, name: true, email: true, role: true, mustChangePassword: true },
  });

  // Encerra as outras sessões abertas com a senha antiga.
  await revokeUserSessions(user.id, req.auth?.sessionId);
  await recordAudit(req, { action: 'PASSWORD_CHANGE', entity: 'User', entityId: user.id });

  res.json({ user: updated });
});
