import type { AdminStaffRole } from '@prisma/client'
import { withSuperAdmin } from '@/lib/prisma'

export type AdminStaffRow = {
  id: string
  email: string
  name: string
  role: AdminStaffRole
  addedAt: Date
  lastActiveAt: Date | null
}

export type AdminSection = 'overview' | 'orders' | 'tenants' | 'billing' | 'growth' | 'staff'

export const SECTION_LABEL: Record<AdminSection, string> = {
  overview: 'Overview',
  orders: 'Orders',
  tenants: 'Tenants',
  billing: 'Billing',
  growth: 'Growth',
  staff: 'Staff',
}

export const ROLE_LABEL: Record<AdminStaffRole, string> = {
  owner: 'Owner',
  support_agent: 'Support Agent',
  billing_manager: 'Billing Manager',
  growth_analyst: 'Growth Analyst',
}

// Single source of truth for what each role can reach — a plain map in code, not the DB,
// so tightening/loosening a role's scope is a one-line change with no migration.
const ROLE_SECTIONS: Record<AdminStaffRole, AdminSection[]> = {
  owner: ['overview', 'orders', 'tenants', 'billing', 'growth', 'staff'],
  support_agent: ['overview', 'orders', 'tenants'],
  billing_manager: ['overview', 'billing'],
  growth_analyst: ['overview', 'growth', 'orders'],
}

export function sectionsForRole(role: AdminStaffRole): AdminSection[] {
  return ROLE_SECTIONS[role]
}

export function canAccessSection(role: AdminStaffRole, section: AdminSection): boolean {
  return ROLE_SECTIONS[role].includes(section)
}

export async function getAdminStaff(): Promise<AdminStaffRow[]> {
  return withSuperAdmin((db) => db.adminStaff.findMany({ orderBy: { addedAt: 'asc' } }))
}

export async function isAdminStaffEmail(email: string): Promise<boolean> {
  const row = await withSuperAdmin((db) =>
    db.adminStaff.findUnique({ where: { email: email.toLowerCase() }, select: { id: true } })
  )
  return row !== null
}

export async function getAdminStaffRole(email: string): Promise<AdminStaffRole | null> {
  const row = await withSuperAdmin((db) =>
    db.adminStaff.findUnique({ where: { email: email.toLowerCase() }, select: { role: true } })
  )
  return row?.role ?? null
}

export async function addAdminStaff(email: string, name: string, role: AdminStaffRole): Promise<AdminStaffRow> {
  return withSuperAdmin((db) =>
    db.adminStaff.create({ data: { email: email.toLowerCase().trim(), name: name.trim(), role } })
  )
}

export async function removeAdminStaff(id: string): Promise<void> {
  await withSuperAdmin((db) => db.adminStaff.delete({ where: { id } }))
}

export async function touchAdminStaffLastActive(email: string): Promise<void> {
  await withSuperAdmin((db) =>
    db.adminStaff.updateMany({ where: { email: email.toLowerCase() }, data: { lastActiveAt: new Date() } })
  )
}
