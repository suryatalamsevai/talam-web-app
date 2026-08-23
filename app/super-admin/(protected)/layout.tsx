import { requireSuperAdmin } from '@/lib/auth-guard'
import { SuperAdminNavShell } from '@/components/super-admin/super-admin-nav-shell'

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await requireSuperAdmin()
  return <SuperAdminNavShell user={user}>{children}</SuperAdminNavShell>
}
