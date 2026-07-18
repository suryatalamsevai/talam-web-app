import { requireOwnerTenant } from '@/lib/admin-guard'
import { listOccasions } from '@/lib/data/occasions'
import { OccasionsClient } from './occasions-client'

export default async function AdminOccasionsPage() {
  const { tenantId } = await requireOwnerTenant()
  const occasions = await listOccasions(tenantId)
  return <OccasionsClient initialOccasions={occasions} />
}
