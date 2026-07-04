import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function withTenant<T>(
  tenantId: string,
  fn: (client: PrismaClient) => Promise<T>
): Promise<T> {
  await prisma.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`
  return fn(prisma)
}
