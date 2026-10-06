const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

export type AuthUser = {
  id: string;
  name: string;
  role: string;
};

export type Patient = {
  id: string;
  fullName: string;
  cpf: string;
  birthDate: string;
  status: string;
  phone?: string;
  email?: string;
  address?: string;
  diagnosis?: string;
  admissionDate?: string;
};

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("revitalize-token");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || "Não foi possível concluir a operação.");
  }

  return data as T;
}

export async function login(email: string, password: string) {
  return apiRequest<{ token: string; user: AuthUser }>("/api/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getPatients(): Promise<Patient[]> {
  return apiRequest<Patient[]>("/api/patients");
}

export async function getPatient(id: string): Promise<Patient> {
  return apiRequest<Patient>(`/api/patients/${id}`);
}
