'use client'

import { useState } from 'react'
import { SettingsBreadcrumb } from '@/components/store/settings-breadcrumb'
import { SettingsShell } from '@/components/store/settings-shell'
import { user } from '@/components/store/settings-sections'

function Content() {
  const [name, setName] = useState(user.name)
  const [phone] = useState(user.phone)
  const [email, setEmail] = useState(user.email)

  return (
    <>
      <SettingsBreadcrumb current="Profile" />
      <div className="mt-4 rounded-xl border border-border bg-surface p-5 sm:p-6">
        <h2 className="font-heading text-lg font-bold text-fg mb-5">Edit Profile</h2>
        <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
          <div>
            <label className="font-body text-xs font-medium text-muted-warm block mb-1.5">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-4 py-2.5 font-body text-sm text-fg outline-none focus:border-store-primary focus:ring-1 focus:ring-store-primary"
            />
          </div>
          <div>
            <label className="font-body text-xs font-medium text-muted-warm block mb-1.5">Phone</label>
            <input
              type="tel"
              value={phone}
              disabled
              className="w-full rounded-lg border border-border bg-bg/50 px-4 py-2.5 font-body text-sm text-muted-warm outline-none cursor-not-allowed"
            />
            <p className="font-body text-[11px] text-muted-warm mt-1">Phone number cannot be changed. Contact support for help.</p>
          </div>
          <div>
            <label className="font-body text-xs font-medium text-muted-warm block mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-border bg-bg px-4 py-2.5 font-body text-sm text-fg outline-none focus:border-store-primary focus:ring-1 focus:ring-store-primary"
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              className="rounded-lg bg-store-primary px-6 py-2.5 font-body text-sm font-semibold text-white hover:bg-store-primary/90 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

export default function ProfilePage() {
  return (
    <>
      <div className="lg:hidden min-h-screen bg-bg px-0 pb-6">
        <Content />
      </div>
      <SettingsShell>
        <Content />
      </SettingsShell>
    </>
  )
}
