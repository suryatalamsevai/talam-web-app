import { headers } from 'next/headers'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'
import { StoreBaseProvider } from '@/components/store/store-context'
import { AdminNavShell } from '@/components/admin/admin-nav-shell'
import { createServerClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { getMissingStoreConfig } from '@/lib/data/tenant'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const hdrs = await headers()
  const storeBase = hdrs.get('x-store-base') ?? ''
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const tenant = user ? await prisma.tenant.findUnique({ where: { ownerId: user.id }, select: { id: true } }) : null
  const missingConfig = tenant ? await getMissingStoreConfig(tenant.id) : []

  return (
    <StoreBaseProvider base={storeBase}>
      <AdminNavShell user={user}>
        {missingConfig.length > 0 ? (
          <div className="flex flex-col gap-2 border-b border-border bg-[#FEF3C7] px-4 py-3 md:px-6">
            {missingConfig.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="flex items-center gap-2 text-sm font-medium text-[#92400E] hover:underline"
              >
                <AlertTriangle className="size-4 shrink-0" />
                {item.label} isn&apos;t configured yet — your store won&apos;t go live until it is. Configure now →
              </Link>
            ))}
          </div>
        ) : null}
        {children}
      </AdminNavShell>
    </StoreBaseProvider>
  )
}
