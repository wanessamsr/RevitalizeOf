import express, { type NextFunction, type Request, type Response } from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Prisma } from '@prisma/client';
import { config } from './config.js';
import { requireAuth, requireClientHeader, requirePasswordChanged } from './auth.js';
import { HttpError } from './http.js';
import { logError } from './logger.js';
import { authRouter } from './routes/auth.js';
import { evolutionsRouter } from './routes/evolutions.js';
import { admissionsRouter, patientsRouter } from './routes/patients.js';
import { auditRouter, usersRouter } from './routes/users.js';

export function createApp() {
  const app = express();

  // Atrás do proxy da Hostinger: necessário para req.ip, req.secure e o limite de tentativas.
  app.set('trust proxy', config.trustProxy);
  app.disable('x-powered-by');

  const connectSrc = ["'self'", ...config.corsOrigins];
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
          fontSrc: ["'self'", 'data:'],
          connectSrc,
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          ...(config.isProduction ? { upgradeInsecureRequests: [] } : {}),
        },
      },
      strictTransportSecurity: config.isProduction ? { maxAge: 31536000, includeSubDomains: true } : false,
      referrerPolicy: { policy: 'no-referrer' },
      crossOriginResourcePolicy: { policy: 'same-site' },
    }),
  );

  if (config.forceHttps) {
    app.use((req, res, next) => {
      if (req.secure) {
        next();
        return;
      }
      res.redirect(308, `https://${req.get('host') ?? ''}${req.originalUrl}`);
    });
  }

  // CORS só é ativado quando o frontend fica em outro endereço (CORS_ORIGINS).
  if (config.corsOrigins.length > 0) {
    app.use(
      '/api',
      cors({
        origin: config.corsOrigins,
        credentials: true,
        methods: ['GET', 'POST', 'PATCH'],
        allowedHeaders: ['Content-Type', 'X-Revitalize-Client'],
        maxAge: 600,
      }),
    );
  }

  app.use('/api', (_req, res, next) => {
    // Respostas com dados de pacientes nunca ficam em cache do navegador ou de proxies.
    res.set('Cache-Control', 'no-store');
    next();
  });

  app.use(
    '/api',
    rateLimit({
      windowMs: 60 * 1000,
      limit: 300,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: 'Muitas requisições. Aguarde um minuto.', code: 'RATE_LIMIT' },
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());
  app.use('/api', requireClientHeader);

  // ---------- Rotas públicas ----------
  app.get('/api/status', (_req, res) => {
    res.json({ message: 'API Revitalize operando com sucesso!' });
  });
  app.use('/api/auth', authRouter);

  // ---------- Rotas protegidas: sessão válida + senha temporária já trocada ----------
  app.use('/api', requireAuth, requirePasswordChanged);
  app.use('/api/users', usersRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/admissions', admissionsRouter);
  app.use('/api', evolutionsRouter);
  app.use('/api/patients', patientsRouter);

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Rota não encontrada', code: 'NOT_FOUND' });
  });

  // ---------- Frontend compilado (mesmo domínio da API) ----------
  // Usa FRONTEND_DIST; em produção, sem a variável, procura revitalize1-main/dist.
  const defaultDist = fileURLToPath(new URL('../../revitalize1-main/dist', import.meta.url));
  const frontendDist = config.frontendDist ?? (config.isProduction ? defaultDist : undefined);
  if (frontendDist) {
    const distDir = path.resolve(frontendDist);
    const indexFile = path.join(distDir, 'index.html');
    if (existsSync(indexFile)) {
      app.use(express.static(distDir, { index: false, maxAge: '1h' }));
      app.get(/^(?!\/api\/).*/, (_req, res) => {
        res.set('Cache-Control', 'no-cache');
        res.sendFile(indexFile);
      });
    } else {
      console.warn(`FRONTEND_DIST definido, mas ${indexFile} não existe. Rode o build do frontend.`);
    }
  }

  // ---------- Tratamento central de erros ----------
  app.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof HttpError) {
      res.status(error.status).json({ error: error.message, code: error.code, fields: error.fields });
      return;
    }
    if (error instanceof SyntaxError && 'body' in error) {
      res.status(400).json({ error: 'JSON inválido', code: 'BAD_JSON' });
      return;
    }
    if (typeof error === 'object' && error !== null && (error as { type?: unknown }).type === 'entity.too.large') {
      res.status(413).json({ error: 'Conteúdo grande demais', code: 'TOO_LARGE' });
      return;
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      res.status(409).json({ error: 'Registro já existe.', code: 'CONFLICT' });
      return;
    }
    logError('requisição', error);
    res.status(500).json({ error: 'Erro interno. Tente novamente.', code: 'INTERNAL' });
  });

  return app;
}
