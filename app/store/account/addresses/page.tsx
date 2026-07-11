'use client'

import { MapPin } from 'lucide-react'
import { SettingsBreadcrumb } from '@/components/store/settings-breadcrumb'
import { SettingsShell } from '@/components/store/settings-shell'
import { AddressesContent } from '@/components/store/settings-sections'

function Content() {
  return (
    <>
      <SettingsBreadcrumb current="Addresses" />
      <div className="mt-4 rounded-xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <MapPin className="h-5 w-5 text-muted-warm" />
          <h2 className="font-heading text-lg font-bold text-fg">Addresses</h2>
        </div>
        <AddressesContent />
      </div>
    </>
  )
}

export default function AddressesPage() {
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
