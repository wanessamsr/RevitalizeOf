// Espelho da matriz de acesso do backend (revitalize-backend/src/roles.ts).
// O backend é quem realmente bloqueia; aqui serve só para esconder o que o
// perfil não pode usar.

export type Role =
  | "ADMIN"
  | "MEDICO"
  | "ENFERMAGEM"
  | "PSICOLOGO"
  | "ASSISTENTE_SOCIAL"
  | "TERAPEUTA_OCUPACIONAL"
  | "RECEPCAO";

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrador do sistema",
  MEDICO: "Médico(a)",
  ENFERMAGEM: "Enfermagem",
  PSICOLOGO: "Psicólogo(a)",
  ASSISTENTE_SOCIAL: "Assistente Social",
  TERAPEUTA_OCUPACIONAL: "Terapeuta Ocupacional",
  RECEPCAO: "Recepção",
};

export const ALL_ROLES = Object.keys(ROLE_LABELS) as Role[];

export const CLINICAL_ROLES: Role[] = ["MEDICO", "ENFERMAGEM", "PSICOLOGO", "ASSISTENTE_SOCIAL", "TERAPEUTA_OCUPACIONAL"];

export const PATIENT_ROLES: Role[] = [...CLINICAL_ROLES, "RECEPCAO"];

export const ADMIN_ROLES: Role[] = ["ADMIN"];

// Perfis que usam as telas de rotina do CAPS (todos, exceto o administrador do sistema).
export const STAFF_ROLES: Role[] = PATIENT_ROLES;

export type EvolutionType = "MEDICA" | "ENFERMAGEM" | "MULTIPROFISSIONAL";

export const EVOLUTION_TYPE_ROLES: Record<EvolutionType, Role[]> = {
  MEDICA: ["MEDICO"],
  ENFERMAGEM: ["ENFERMAGEM"],
  MULTIPROFISSIONAL: CLINICAL_ROLES,
};

export function hasRole(role: Role | undefined, allowed: Role[]): boolean {
  return role !== undefined && allowed.includes(role);
}
