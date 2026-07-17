import { SettingsBreadcrumb } from '@/components/store/settings-breadcrumb'
import { SettingsShell } from '@/components/store/settings-shell'
import { requireAuth, requireTenant } from '@/lib/auth-guard'
import { getCustomerAccountSummary } from '@/lib/data/customer-account'
import { ProfileForm } from './profile-form'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const authUser = await requireAuth('/account/profile')
  const { tenantId } = await requireTenant()
  const summary = await getCustomerAccountSummary(tenantId, authUser.id)

  const avatarUrl = (authUser.user_metadata?.avatar_url as string | undefined) ?? null
  const name = summary.name ?? (authUser.user_metadata?.full_name as string | undefined) ?? ''
  const phone = summary.phone ?? authUser.phone ?? ''
  const email = summary.email ?? authUser.email ?? '—'

  const sidebarUser = {
    name: name || email,
    phone,
    initial: (name || email).charAt(0).toUpperCase() || '?',
    avatarUrl,
  }

  return (
    <>
      <div className="lg:hidden min-h-screen bg-bg px-0 pb-6">
        <SettingsBreadcrumb current="Profile" />
        <div className="mt-4">
          <ProfileForm avatarUrl={avatarUrl} initialName={name} initialPhone={phone} email={email} />
        </div>
      </div>
      <SettingsShell user={sidebarUser}>
        <SettingsBreadcrumb current="Profile" />
        <div className="mt-4">
          <ProfileForm avatarUrl={avatarUrl} initialName={name} initialPhone={phone} email={email} />
        </div>
      </SettingsShell>
    </>
  )
}
