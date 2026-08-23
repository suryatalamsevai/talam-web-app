import { getAdminStaff } from '@/lib/data/admin-staff'
import { StaffListClient } from './staff-list-client'

export default async function SuperAdminStaffPage() {
  const staff = await getAdminStaff()
  return <StaffListClient staff={staff} />
}
