import { config } from './config.js';
import { createApp } from './app.js';
import { prisma } from './db.js';
import { ensureFirstAdmin } from './bootstrap.js';
import { logError, logInfo } from './logger.js';

async function main(): Promise<void> {
  await prisma.$connect();
  await ensureFirstAdmin();

  const app = createApp();
  const server = app.listen(config.port, () => {
    logInfo(`Servidor rodando na porta ${config.port} (${config.env})`);
  });

  const shutdown = (signal: string) => {
    logInfo(`${signal} recebido, encerrando...`);
    server.close(() => {
      void prisma.$disconnect().finally(() => process.exit(0));
    });
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(async (error: unknown) => {
  logError('inicialização', error);
  await prisma.$disconnect().catch(() => undefined);
  process.exit(1);
});
