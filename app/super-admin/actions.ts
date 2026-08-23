'use server'

import { revalidatePath } from 'next/cache'
import type { OnboardingStage, OnboardingStageStatus, Tier, AdminStaffRole } from '@prisma/client'
import { requireSuperAdmin } from '@/lib/auth-guard'
import { withSuperAdmin } from '@/lib/prisma'
import { connectShiprocketAccount, getShippingConfig } from '@/lib/shipping/shiprocket-account'
import { addAdminStaff, removeAdminStaff } from '@/lib/data/admin-staff'

type ActionResult = { success: true } | { error: string }

function revalidateTenant(tenantId: string) {
  revalidatePath(`/super-admin/tenants/${tenantId}`)
  revalidatePath('/super-admin')
}

// razorpay stage is driven only by the Razorpay webhook (app/api/webhooks/razorpay/route.ts) —
// allowing manual edits here would let the UI and webhook disagree about state.
export async function updateOnboardingStageAction(
  tenantId: string,
  stage: OnboardingStage,
  status: OnboardingStageStatus
): Promise<ActionResult> {
  await requireSuperAdmin()

  if (stage === 'razorpay') {
    return { error: 'Razorpay stage is read-only — it is driven by the payment webhook.' }
  }

  await withSuperAdmin((db) =>
    db.tenant.update({ where: { id: tenantId }, data: { onboardingStage: stage, onboardingStageStatus: status } })
  )
  revalidateTenant(tenantId)
  return { success: true }
}

export async function suspendTenantAction(tenantId: string): Promise<ActionResult> {
  await requireSuperAdmin()
  await withSuperAdmin((db) => db.tenant.update({ where: { id: tenantId }, data: { suspendedAt: new Date() } }))
  revalidateTenant(tenantId)
  return { success: true }
}

export async function unsuspendTenantAction(tenantId: string): Promise<ActionResult> {
  await requireSuperAdmin()
  await withSuperAdmin((db) => db.tenant.update({ where: { id: tenantId }, data: { suspendedAt: null } }))
  revalidateTenant(tenantId)
  return { success: true }
}

// ── Shipping (Model A) ──
// Staff-assisted onboarding: support walks a shop through Shiprocket signup by phone, then
// enters the resulting credentials here on their behalf. Deliberately the *same*
// connectShiprocketAccount the tenant's own Settings tab calls — only the guard and the
// recorded actor differ, so there is one verification and storage path, not two.

export async function staffConnectShippingAction(
  tenantId: string,
  email: string,
  password: string,
  pickupLocation: string
): Promise<ActionResult> {
  await requireSuperAdmin()

  const result = await connectShiprocketAccount({
    tenantId,
    email,
    password,
    pickupLocation,
    actor: 'staff',
  })
  if (result.error) return { error: result.error }

  revalidateTenant(tenantId)
  return { success: true }
}

/** Lets a staff member claim an assist request so it stops reading as untouched in the list. */
export async function markShippingAssistInProgressAction(tenantId: string): Promise<ActionResult> {
  await requireSuperAdmin()

  const current = await getShippingConfig(tenantId)
  if (current.mode !== 'assist_requested') {
    return { error: 'This store has no open Shiprocket setup request.' }
  }

  await withSuperAdmin((db) =>
    db.tenant.update({
      where: { id: tenantId },
      data: { shippingConfig: { ...current, mode: 'assist_in_progress' } },
    })
  )
  revalidateTenant(tenantId)
  return { success: true }
}

// ── Tier override ──
// Manually setting `tier` bypasses whatever billing/payment flow would normally move a
// tenant between plans — used for comps, downgrades during a dispute, or fixing a stuck
// upgrade. Deliberately a single direct write: there is no approval step, same as suspend.
export async function overrideTenantTierAction(tenantId: string, tier: Tier): Promise<ActionResult> {
  await requireSuperAdmin()
  await withSuperAdmin((db) => db.tenant.update({ where: { id: tenantId }, data: { tier } }))
  revalidateTenant(tenantId)
  return { success: true }
}

// ── Staff ──

export async function inviteStaffAction(email: string, name: string, role: AdminStaffRole): Promise<ActionResult> {
  await requireSuperAdmin()

  if (!email.includes('@')) return { error: 'Enter a valid email address.' }
  if (!name.trim()) return { error: 'Enter a name.' }

  try {
    await addAdminStaff(email, name, role)
  } catch {
    return { error: 'That email is already on staff.' }
  }
  revalidatePath('/super-admin/staff')
  return { success: true }
}

export async function removeStaffAction(id: string): Promise<ActionResult> {
  await requireSuperAdmin()
  await removeAdminStaff(id)
  revalidatePath('/super-admin/staff')
  return { success: true }
}
