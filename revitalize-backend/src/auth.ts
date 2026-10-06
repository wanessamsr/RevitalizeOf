import { createHash, randomBytes, randomInt } from 'node:crypto';
import bcrypt from 'bcrypt';
import type { CookieOptions, NextFunction, Request, Response } from 'express';
import type { Role, User } from '@prisma/client';
import { config } from './config.js';
import { prisma } from './db.js';
import { clientAgent, clientIp, recordAudit } from './audit.js';
import { HttpError } from './http.js';
import { hasRole } from './roles.js';

export type SessionUser = Pick<User, 'id' | 'name' | 'email' | 'role' | 'mustChangePassword'>;

export interface AuthContext {
  user: SessionUser;
  sessionId: string;
  expiresAt: Date;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

// ---------- Senhas ----------

const BCRYPT_COST = 12;

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

// Hash fixo usado quando o e-mail não existe, para que o tempo de resposta do
// login seja o mesmo com ou sem usuário cadastrado.
const dummyHashPromise = bcrypt.hash(randomBytes(16).toString('hex'), BCRYPT_COST);

export async function verifyPassword(plain: string, hash: string | null): Promise<boolean> {
  if (!hash) {
    await bcrypt.compare(plain, await dummyHashPromise);
    return false;
  }
  return bcrypt.compare(plain, hash);
}

// Senha temporária legível (sem caracteres ambíguos), entregue uma única vez ao administrador.
export function generateTemporaryPassword(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = letters + digits;
  const chars: string[] = [];
  chars.push(letters.charAt(randomInt(letters.length)));
  chars.push(digits.charAt(randomInt(digits.length)));
  while (chars.length < 14) chars.push(all.charAt(randomInt(all.length)));
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    const tmp = chars[i] as string;
    chars[i] = chars[j] as string;
    chars[j] = tmp;
  }
  return chars.join('');
}

// ---------- Sessões ----------

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: config.session.cookieSecure,
    sameSite: config.session.sameSite,
    path: '/',
    maxAge: config.session.maxAgeMs,
  };
}

export function clearSessionCookie(res: Response): void {
  const { maxAge: _maxAge, ...options } = cookieOptions();
  res.clearCookie(config.session.cookieName, options);
}

export async function createSession(req: Request, res: Response, userId: string): Promise<{ sessionId: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('base64url');
  const sessionId = hashToken(token);
  const expiresAt = new Date(Date.now() + config.session.maxAgeMs);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      expiresAt,
      ip: clientIp(req),
      userAgent: clientAgent(req),
    },
  });

  res.cookie(config.session.cookieName, token, cookieOptions());
  return { sessionId, expiresAt };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await prisma.session.updateMany({
    where: { id: sessionId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

export async function revokeUserSessions(userId: string, exceptSessionId?: string): Promise<void> {
  await prisma.session.updateMany({
    where: {
      userId,
      revokedAt: null,
      ...(exceptSessionId ? { NOT: { id: exceptSessionId } } : {}),
    },
    data: { revokedAt: new Date() },
  });
}

// Só atualiza lastSeenAt se passou mais de 1 minuto, para não gravar no banco a cada clique.
const LAST_SEEN_WRITE_INTERVAL_MS = 60 * 1000;

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token: unknown = req.cookies?.[config.session.cookieName];
  if (typeof token !== 'string' || token.length < 20 || token.length > 100) {
    res.status(401).json({ error: 'Faça login para continuar', code: 'UNAUTHENTICATED' });
    return;
  }

  const sessionId = hashToken(token);
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: {
      user: { select: { id: true, name: true, email: true, role: true, mustChangePassword: true, active: true } },
    },
  });

  const now = Date.now();
  const expired =
    !session ||
    session.revokedAt !== null ||
    session.expiresAt.getTime() <= now ||
    now - session.lastSeenAt.getTime() > config.session.idleMs ||
    !session.user.active;

  if (expired) {
    if (session && session.revokedAt === null) {
      await revokeSession(session.id);
      await recordAudit(req, { action: 'SESSION_EXPIRED', entity: 'Auth', userId: session.userId });
    }
    clearSessionCookie(res);
    res.status(401).json({ error: 'Sua sessão expirou. Entre novamente.', code: 'SESSION_EXPIRED' });
    return;
  }

  if (now - session.lastSeenAt.getTime() > LAST_SEEN_WRITE_INTERVAL_MS) {
    await prisma.session.update({ where: { id: session.id }, data: { lastSeenAt: new Date(now) } });
  }

  const { active: _active, ...user } = session.user;
  req.auth = { user, sessionId: session.id, expiresAt: session.expiresAt };
  next();
}

// Bloqueia tudo (exceto as rotas de conta) enquanto o usuário não trocar a senha temporária.
export function requirePasswordChanged(req: Request, res: Response, next: NextFunction): void {
  if (req.auth?.user.mustChangePassword) {
    res.status(403).json({ error: 'Troque sua senha temporária para continuar.', code: 'PASSWORD_CHANGE_REQUIRED' });
    return;
  }
  next();
}

export function requireRole(allowed: readonly Role[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const user = req.auth?.user;
    if (!user) {
      res.status(401).json({ error: 'Faça login para continuar', code: 'UNAUTHENTICATED' });
      return;
    }
    if (!hasRole(user.role, allowed)) {
      await recordAudit(req, {
        action: 'ACCESS_DENIED',
        entity: 'Auth',
        details: `${req.method} ${req.baseUrl}${req.route?.path ?? ''}`.slice(0, 200),
      });
      res.status(403).json({ error: 'Seu perfil não tem permissão para esta ação.', code: 'FORBIDDEN' });
      return;
    }
    next();
  };
}

export function currentUser(req: Request): SessionUser {
  if (!req.auth) throw new HttpError(401, 'Faça login para continuar', 'UNAUTHENTICATED');
  return req.auth.user;
}

// Proteção contra CSRF: toda requisição que altera dados precisa do cabeçalho
// X-Revitalize-Client, que um site de terceiros não consegue enviar sem
// passar pelo CORS. Somado ao cookie SameSite=Strict.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function requireClientHeader(req: Request, res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }
  if (req.get('x-revitalize-client') !== 'web') {
    res.status(403).json({ error: 'Requisição recusada.', code: 'CSRF' });
    return;
  }
  next();
}
