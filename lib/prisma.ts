import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function makePrisma() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
    max: process.env.NODE_ENV === 'production' ? 1 : 5,
  })
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? makePrisma()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export async function withTenant<T>(
  tenantId: string,
  fn: (client: PrismaClient) => Promise<T>
): Promise<T> {
  // ponytail: set_config(..., true) is transaction-local — must run on the same
  // pooled connection as the query it scopes, or RLS silently hides every row
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.tenant_id', ${tenantId}, true)`
    return fn(tx as PrismaClient)
  })
}
