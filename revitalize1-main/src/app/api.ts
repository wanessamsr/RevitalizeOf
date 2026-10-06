import type { EvolutionType, Role } from "./roles";

// Por padrão a API fica no mesmo endereço do site (em desenvolvimento o Vite
// repassa /api para http://localhost:3000). Só defina VITE_API_URL se a API
// ficar em outro domínio, sempre com https.
const API_URL = (import.meta.env.VITE_API_URL ?? "").replace(/\/$/, "");

export const UNAUTHORIZED_EVENT = "revitalize:unauthorized";
export const PASSWORD_CHANGE_EVENT = "revitalize:password-change-required";

export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;
  readonly fields?: Record<string, string>;

  constructor(status: number, message: string, code?: string, fields?: Record<string, string>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

// ---------- Tipos ----------

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
};

export type SessionInfo = {
  idleMinutes: number;
  expiresAt: string;
};

export type PatientStatus = "ATIVO" | "EM_CRISE" | "INATIVO";

export const PATIENT_STATUS_LABELS: Record<PatientStatus, string> = {
  ATIVO: "Ativo",
  EM_CRISE: "Em Crise",
  INATIVO: "Inativo",
};

export type Patient = {
  id: string;
  fullName: string;
  socialName: string | null;
  cpf: string;
  birthDate: string;
  status: PatientStatus;
  createdAt: string;
};

export type PatientDetail = Patient & {
  lastAdmission: {
    id: string;
    type: string;
    date: string;
    author: { name: string; role: Role };
  } | null;
};

export type PatientPage = {
  items: Patient[];
  total: number;
  page: number;
  pageSize: number;
};

export type VitalSigns = {
  bloodPressure?: string;
  heartRate?: string;
  temperature?: string;
  spo2?: string;
};

export type EvolutionTopic = { title: string; content: string; isPrivate: boolean };

export type Prescription = { medicine: string; dosage: string; frequency: string };

export type Evolution = {
  id: string;
  patientId: string;
  type: EvolutionType;
  attendanceType: string;
  occurredAt: string;
  notes: string;
  details: {
    vitalSigns?: VitalSigns;
    topics?: EvolutionTopic[];
    prescriptions?: Prescription[];
  } | null;
  amendsId: string | null;
  createdAt: string;
  author: { id: string; name: string; role: Role };
};

export type NewEvolutionInput = {
  type: EvolutionType;
  attendanceType: string;
  occurredAt: string;
  notes: string;
  vitalSigns?: VitalSigns;
  topics?: EvolutionTopic[];
  prescriptions?: Prescription[];
};

export type AdmissionDetail = { section: string; label: string; value: string };

export type NewAdmissionInput = {
  type: "geral" | "transtorno-mental" | "alcool-drogas";
  patient: { fullName: string; socialName?: string; cpf: string; birthDate: string };
  reason: string;
  details: AdmissionDetail[];
};

export type ManagedUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  mustChangePassword: boolean;
  lockedUntil: string | null;
  lastLoginAt: string | null;
  createdAt: string;
};

export type AuditEntry = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ip: string | null;
  createdAt: string;
  user: { id: string; name: string; role: Role } | null;
};

// ---------- Cliente HTTP ----------

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      // A sessão viaja só no cookie httpOnly; nenhum token fica no navegador.
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        "X-Revitalize-Client": "web",
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(0, "Não foi possível conectar ao servidor. Verifique a internet.");
  }

  if (response.status === 204) return undefined as T;

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const isLoginAttempt = path.startsWith("/api/auth/login");
    if (response.status === 401 && !isLoginAttempt) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: data.code }));
    }
    if (response.status === 403 && data.code === "PASSWORD_CHANGE_REQUIRED") {
      window.dispatchEvent(new CustomEvent(PASSWORD_CHANGE_EVENT));
    }
    throw new ApiError(response.status, data.error || "Não foi possível concluir a operação.", data.code, data.fields);
  }

  return data as T;
}

function post<T>(path: string, body?: unknown): Promise<T> {
  return apiRequest<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
}

function patch<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

// ---------- Autenticação ----------

export function login(email: string, password: string) {
  return post<{ user: AuthUser; session: SessionInfo }>("/api/auth/login", { email, password });
}

export function getMe() {
  return apiRequest<{ user: AuthUser; session: SessionInfo }>("/api/auth/me");
}

export function pingSession() {
  return post<void>("/api/auth/ping");
}

export function logout() {
  return post<void>("/api/auth/logout");
}

export function changePassword(currentPassword: string, newPassword: string) {
  return post<{ user: AuthUser }>("/api/auth/change-password", { currentPassword, newPassword });
}

// ---------- Pacientes ----------

export function getPatients(params: { search?: string; status?: PatientStatus; page?: number } = {}): Promise<PatientPage> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.status) query.set("status", params.status);
  if (params.page) query.set("page", String(params.page));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<PatientPage>(`/api/patients${suffix}`);
}

export function getPatient(id: string): Promise<PatientDetail> {
  return apiRequest<PatientDetail>(`/api/patients/${encodeURIComponent(id)}`);
}

export function updatePatientStatus(id: string, status: PatientStatus) {
  return patch<{ id: string; status: PatientStatus }>(`/api/patients/${encodeURIComponent(id)}/status`, { status });
}

export function createAdmission(input: NewAdmissionInput) {
  return post<{ patientId: string; admissionId: string }>("/api/admissions", input);
}

// ---------- Evoluções ----------

export function getEvolutions(patientId: string): Promise<Evolution[]> {
  return apiRequest<Evolution[]>(`/api/patients/${encodeURIComponent(patientId)}/evolutions`);
}

export function createEvolution(patientId: string, input: NewEvolutionInput): Promise<Evolution> {
  return post<Evolution>(`/api/patients/${encodeURIComponent(patientId)}/evolutions`, input);
}

export function createAddendum(evolutionId: string, notes: string): Promise<Evolution> {
  return post<Evolution>(`/api/evolutions/${encodeURIComponent(evolutionId)}/addenda`, { notes });
}

// ---------- Administração ----------

export function getUsers(): Promise<ManagedUser[]> {
  return apiRequest<ManagedUser[]>("/api/users");
}

export function createUser(input: { name: string; email: string; role: Role }) {
  return post<{ user: ManagedUser; temporaryPassword: string }>("/api/users", input);
}

export function updateUser(id: string, input: { name?: string; role?: Role; active?: boolean; unlock?: true }) {
  return patch<ManagedUser>(`/api/users/${encodeURIComponent(id)}`, input);
}

export function resetUserPassword(id: string) {
  return post<{ user: ManagedUser; temporaryPassword: string }>(`/api/users/${encodeURIComponent(id)}/reset-password`);
}

export function getAuditLog(params: { entityId?: string; page?: number } = {}) {
  const query = new URLSearchParams();
  if (params.entityId) query.set("entityId", params.entityId);
  if (params.page) query.set("page", String(params.page));
  const suffix = query.toString() ? `?${query.toString()}` : "";
  return apiRequest<{ items: AuditEntry[]; total: number; page: number; pageSize: number }>(`/api/audit${suffix}`);
}

// ---------- Utilidades de exibição ----------

export function formatDateBR(isoDate: string): string {
  // Datas "AAAA-MM-DD" são mostradas sem conversão de fuso para não voltar um dia.
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  const date = new Date(isoDate);
  return Number.isNaN(date.getTime()) ? isoDate : date.toLocaleDateString("pt-BR");
}

export function formatDateTimeBR(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? iso
    : date.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ageFrom(isoDate: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return null;
  const today = new Date();
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  return age;
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter((part) => part.length > 0)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
