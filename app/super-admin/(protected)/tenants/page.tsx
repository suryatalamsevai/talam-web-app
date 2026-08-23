import { getAllTenants } from '@/lib/data/super-admin'
import { TenantsListClient } from './tenants-list-client'

export default async function SuperAdminTenantsPage() {
  const tenants = await getAllTenants()
  return <TenantsListClient tenants={tenants} />
}
