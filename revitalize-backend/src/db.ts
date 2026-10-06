import { PrismaClient } from '@prisma/client';

// Uma única conexão compartilhada por toda a aplicação.
export const prisma = new PrismaClient({
  log: ['warn', 'error'],
});
