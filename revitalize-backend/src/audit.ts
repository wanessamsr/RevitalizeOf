import type { Request } from 'express';
import { prisma } from './db.js';

export type AuditAction =
  | 'LOGIN'
  | 'LOGIN_FAIL'
  | 'LOGIN_BLOCKED'
  | 'LOGOUT'
  | 'SESSION_EXPIRED'
  | 'PASSWORD_CHANGE'
  | 'PASSWORD_RESET'
  | 'LIST'
  | 'VIEW'
  | 'CREATE'
  | 'ADDENDUM'
  | 'UPDATE'
  | 'ACCESS_DENIED';

export type AuditEntity = 'Auth' | 'User' | 'Patient' | 'Evolution' | 'Admission' | 'AuditLog';

interface AuditInput {
  action: AuditAction;
  entity: AuditEntity;
  entityId?: string | null;
  details?: string | null;
  userId?: string | null;
}

export function clientIp(req: Request): string | null {
  return (req.ip ?? '').slice(0, 64) || null;
}

export function clientAgent(req: Request): string | null {
  const agent = req.get('user-agent');
  return agent ? agent.slice(0, 255) : null;
}

// Para registros ligados a um paciente, entityId é sempre o id do paciente,
// assim o filtro da tela de auditoria mostra tudo o que aconteceu com ele.
// Grava um registro de auditoria. É aguardado de propósito: se a trilha não
// puder ser gravada, a operação falha em vez de acontecer sem registro.
export async function recordAudit(req: Request, input: AuditInput): Promise<void> {
  await prisma.auditLog.create({
    data: {
      userId: input.userId !== undefined ? input.userId : (req.auth?.user.id ?? null),
      action: input.action,
      entity: input.entity,
      entityId: input.entityId ?? null,
      details: input.details ? input.details.slice(0, 500) : null,
      ip: clientIp(req),
      userAgent: clientAgent(req),
    },
  });
}
