import { z } from 'zod';

// Erro com status HTTP e mensagem segura para mostrar ao usuário.
export class HttpError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly fields: Record<string, string> | undefined;

  constructor(status: number, message: string, code?: string, fields?: Record<string, string>) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

// Valida dados de entrada com zod. Em caso de erro, responde 400 com a primeira
// mensagem de cada campo, sem ecoar o valor recebido.
export function parseInput<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  const result = schema.safeParse(data);
  if (result.success) return result.data;

  const fields: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = issue.path.length > 0 ? issue.path.join('.') : '_';
    if (!(key in fields)) fields[key] = issue.message;
  }
  const first = Object.values(fields)[0] ?? 'Dados inválidos';
  throw new HttpError(400, first, 'VALIDATION_ERROR', fields);
}

// ---------- Regras de validação reutilizáveis ----------

export const idParam = z.object({
  id: z.uuid({ error: 'Identificador inválido' }),
});

export const emailSchema = z
  .string({ error: 'Informe o e-mail' })
  .trim()
  .toLowerCase()
  .max(191, { error: 'E-mail muito longo' })
  .pipe(z.email({ error: 'E-mail inválido' }));

// Política de senha: 10 a 72 caracteres (limite do bcrypt), com letras e números.
export const passwordSchema = z
  .string({ error: 'Informe a senha' })
  .min(10, { error: 'A senha deve ter pelo menos 10 caracteres' })
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, { error: 'A senha deve ter no máximo 72 caracteres' })
  .refine((value) => /[A-Za-zÀ-ÿ]/.test(value) && /\d/.test(value), {
    error: 'A senha deve ter letras e números',
  });

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function isValidCpf(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const digits = cpf.split('').map(Number);
  const calc = (length: number): number => {
    let sum = 0;
    for (let i = 0; i < length; i += 1) sum += (digits[i] ?? 0) * (length + 1 - i);
    const rest = (sum * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(9) === digits[9] && calc(10) === digits[10];
}

export const cpfSchema = z
  .string({ error: 'Informe o CPF' })
  .transform(onlyDigits)
  .refine(isValidCpf, { error: 'CPF inválido' });

export function maskCpf(cpf: string): string {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11) return '***.***.***-**';
  return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
}

export function formatCpf(cpf: string): string {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11) return cpf;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

// Data no formato AAAA-MM-DD (campo <input type="date">).
export const dateOnlySchema = z
  .string({ error: 'Informe a data' })
  .regex(/^\d{4}-\d{2}-\d{2}$/, { error: 'Data inválida' })
  .transform((value) => new Date(`${value}T00:00:00.000Z`))
  .refine((date) => !Number.isNaN(date.getTime()), { error: 'Data inválida' });
