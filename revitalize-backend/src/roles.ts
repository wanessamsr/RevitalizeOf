import type { EvolutionType, Role } from '@prisma/client';

// Matriz de acesso do Revitalize. Para mudar quem pode fazer o quê, altere
// somente este arquivo (e o espelho em revitalize1-main/src/app/roles.ts).

export const ALL_ROLES: readonly Role[] = [
  'ADMIN',
  'MEDICO',
  'ENFERMAGEM',
  'PSICOLOGO',
  'ASSISTENTE_SOCIAL',
  'TERAPEUTA_OCUPACIONAL',
  'RECEPCAO',
];

// Profissionais que leem e escrevem conteúdo clínico (evoluções).
export const CLINICAL_ROLES: readonly Role[] = [
  'MEDICO',
  'ENFERMAGEM',
  'PSICOLOGO',
  'ASSISTENTE_SOCIAL',
  'TERAPEUTA_OCUPACIONAL',
];

// Quem vê cadastro de pacientes (nome, CPF, nascimento, status) e faz acolhimento.
// O administrador do sistema gerencia contas e auditoria, mas não acessa pacientes.
export const PATIENT_ROLES: readonly Role[] = [...CLINICAL_ROLES, 'RECEPCAO'];

export const ADMIN_ROLES: readonly Role[] = ['ADMIN'];

// Quem pode registrar cada tipo de evolução.
export const EVOLUTION_TYPE_ROLES: Record<EvolutionType, readonly Role[]> = {
  MEDICA: ['MEDICO'],
  ENFERMAGEM: ['ENFERMAGEM'],
  MULTIPROFISSIONAL: CLINICAL_ROLES,
};

export function hasRole(role: Role, allowed: readonly Role[]): boolean {
  return allowed.includes(role);
}
