import 'dotenv/config';
import { z } from 'zod';

const booleanFromEnv = z
  .enum(['true', 'false', '1', '0'])
  .transform((value) => value === 'true' || value === '1');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DATABASE_URL: z
    .string({ error: 'DATABASE_URL não definida' })
    .startsWith('mysql://', { error: 'DATABASE_URL deve começar com mysql://' }),

  SESSION_IDLE_MINUTES: z.coerce.number().int().min(5).max(120).default(15),
  SESSION_MAX_HOURS: z.coerce.number().int().min(1).max(24).default(8),
  COOKIE_SECURE: booleanFromEnv.optional(),
  COOKIE_SAMESITE: z.enum(['strict', 'lax', 'none']).default('strict'),

  CORS_ORIGINS: z.string().optional(),
  TRUST_PROXY: z.coerce.number().int().min(0).max(5).optional(),
  FORCE_HTTPS: booleanFromEnv.default(false),
  FRONTEND_DIST: z.string().optional(),

  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(20).default(5),
  LOGIN_LOCK_MINUTES: z.coerce.number().int().min(1).max(1440).default(15),

  BOOTSTRAP_ADMIN_NAME: z.string().optional(),
  BOOTSTRAP_ADMIN_EMAIL: z.string().optional(),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const problems = parsed.error.issues.map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`);
  console.error(`Configuração inválida. Corrija as variáveis de ambiente:\n${problems.join('\n')}`);
  process.exit(1);
}

const env = parsed.data;
const isProduction = env.NODE_ENV === 'production';

const cookieSecure = env.COOKIE_SECURE ?? isProduction;

if (env.COOKIE_SAMESITE === 'none' && !cookieSecure) {
  console.error('COOKIE_SAMESITE=none exige COOKIE_SECURE=true (HTTPS).');
  process.exit(1);
}

if (isProduction) {
  if (!cookieSecure) {
    console.error('Em produção o cookie de sessão precisa ser seguro: remova COOKIE_SECURE=false e use HTTPS.');
    process.exit(1);
  }
  try {
    const dbUser = decodeURIComponent(new URL(env.DATABASE_URL).username);
    if (dbUser === 'root') {
      console.error('Em produção não use o usuário root do MySQL. Crie um usuário exclusivo para o Revitalize.');
      process.exit(1);
    }
  } catch {
    console.error('DATABASE_URL inválida.');
    process.exit(1);
  }
}

const corsOrigins = (env.CORS_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim().replace(/\/$/, ''))
  .filter((origin) => origin.length > 0);

if (corsOrigins.includes('*')) {
  console.error('CORS_ORIGINS não pode ser "*". Liste os endereços exatos do frontend.');
  process.exit(1);
}

export const config = {
  env: env.NODE_ENV,
  isProduction,
  port: env.PORT,
  session: {
    cookieName: 'revitalize_sid',
    idleMs: env.SESSION_IDLE_MINUTES * 60 * 1000,
    maxAgeMs: env.SESSION_MAX_HOURS * 60 * 60 * 1000,
    idleMinutes: env.SESSION_IDLE_MINUTES,
    cookieSecure,
    sameSite: env.COOKIE_SAMESITE,
  },
  login: {
    maxAttempts: env.LOGIN_MAX_ATTEMPTS,
    lockMs: env.LOGIN_LOCK_MINUTES * 60 * 1000,
  },
  corsOrigins,
  trustProxy: env.TRUST_PROXY ?? (isProduction ? 1 : 0),
  forceHttps: env.FORCE_HTTPS,
  frontendDist: env.FRONTEND_DIST,
  bootstrapAdmin: {
    name: env.BOOTSTRAP_ADMIN_NAME,
    email: env.BOOTSTRAP_ADMIN_EMAIL,
    password: env.BOOTSTRAP_ADMIN_PASSWORD,
  },
} as const;
