import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const shouldLogQueries =
  process.env.PRISMA_LOG_QUERIES === 'true' ||
  (process.env.NODE_ENV !== 'production' && process.env.PRISMA_LOG_QUERIES === '1');

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: shouldLogQueries
    ? ['error', 'warn', 'query']
    : process.env.NODE_ENV === 'development'
      ? ['error', 'warn']
      : ['error'],
});

globalForPrisma.prisma = prisma;
