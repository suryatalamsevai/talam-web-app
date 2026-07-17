'use client'

import { useState, useTransition } from 'react'
import { updateCustomerProfile } from './actions'

type Props = {
  avatarUrl: string | null
  initialName: string
  initialPhone: string
  email: string
}

export function ProfileForm({ avatarUrl, initialName, initialPhone, email }: Props) {
  const [name, setName] = useState(initialName)
  const [phone, setPhone] = useState(initialPhone)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaved(false)
    startTransition(async () => {
      await updateCustomerProfile({ name, phone })
      setSaved(true)
    })
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 sm:p-6">
      <h2 className="font-heading text-lg font-bold text-fg mb-5">Edit Profile</h2>

      {avatarUrl && (
        <div className="mb-5 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={avatarUrl} alt="" className="size-14 rounded-full object-cover" />
          <span className="font-body text-xs text-muted-warm">From your Google account</span>
        </div>
      )}

      <form className="space-y-4" onSubmit={handleSubmit}>
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
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full rounded-lg border border-border bg-bg px-4 py-2.5 font-body text-sm text-fg outline-none focus:border-store-primary focus:ring-1 focus:ring-store-primary"
          />
        </div>
        <div>
          <label className="font-body text-xs font-medium text-muted-warm block mb-1.5">Email</label>
          <input
            type="email"
            value={email}
            disabled
            className="w-full rounded-lg border border-border bg-bg/50 px-4 py-2.5 font-body text-sm text-muted-warm outline-none cursor-not-allowed"
          />
          <p className="font-body text-[11px] text-muted-warm mt-1">Email is managed by your sign-in provider.</p>
        </div>
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-store-primary px-6 py-2.5 font-body text-sm font-semibold text-white hover:bg-store-primary/90 transition-colors disabled:opacity-60"
          >
            {isPending ? 'Saving…' : 'Save Changes'}
          </button>
          {saved && !isPending && <span className="font-body text-xs text-success">Saved</span>}
        </div>
      </form>
    </div>
  )
}
