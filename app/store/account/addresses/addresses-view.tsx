'use client'

import { useRef, useState, useTransition } from 'react'
import { Plus, Pencil, Trash, Info } from 'lucide-react'
import { createAddress, type NewAddress } from './actions'
import type { AddressItem } from '@/lib/data/addresses'

const EMPTY_FORM: NewAddress = {
  label: 'Home',
  name: '',
  line1: '',
  line2: '',
  city: '',
  state: '',
  pincode: '',
  phone: '',
  isDefault: false,
}

export function AddressesView({ initialAddresses }: { initialAddresses: AddressItem[] }) {
  const [addresses, setAddresses] = useState(initialAddresses)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [form, setForm] = useState<NewAddress>(EMPTY_FORM)
  const [isPending, startTransition] = useTransition()

  function openDialog() {
    setForm(EMPTY_FORM)
    dialogRef.current?.showModal()
  }

  function closeDialog() {
    dialogRef.current?.close()
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      await createAddress(form)
      setAddresses((prev) => {
        const cleared = form.isDefault ? prev.map((a) => ({ ...a, isDefault: false })) : prev
        return [{ id: crypto.randomUUID(), ...form, line2: form.line2 || null }, ...cleared]
      })
      closeDialog()
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-body text-sm font-bold text-fg">Saved Addresses</h3>
        <button
          type="button"
          onClick={openDialog}
          className="flex items-center gap-1.5 rounded-lg border border-store-primary px-3 py-1.5 font-body text-xs font-semibold text-store-primary hover:bg-store-primary/5"
        >
          <Plus className="h-3.5 w-3.5" /> Add New Address
        </button>
      </div>

      {addresses.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-10 text-center">
          <p className="font-body text-sm text-muted-warm">You haven&apos;t saved any addresses yet.</p>
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 border border-amber-200">
            <Info className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p className="font-body text-xs text-amber-800">One default address is required to place orders.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {addresses.map((addr) => (
              <div key={addr.id} className="rounded-xl border border-border p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-body text-sm font-bold text-fg">{addr.label}</span>
                  {addr.isDefault && (
                    <span className="rounded-full bg-success/10 px-2 py-0.5 font-body text-[10px] font-bold text-success uppercase tracking-wide">Default</span>
                  )}
                </div>
                <p className="font-body text-sm text-fg">{addr.name}</p>
                <p className="font-body text-xs text-muted-warm mt-0.5">{addr.line1}</p>
                {addr.line2 && <p className="font-body text-xs text-muted-warm">{addr.line2}</p>}
                <p className="font-body text-xs text-muted-warm">{addr.city}, {addr.state} {addr.pincode}</p>
                <p className="font-body text-xs text-muted-warm mt-1">{addr.phone}</p>
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                  <button type="button" className="flex items-center gap-1 font-body text-xs font-medium text-store-primary hover:underline">
                    <Pencil className="h-3 w-3" /> Edit
                  </button>
                  <span className="text-border">·</span>
                  <button type="button" className="flex items-center gap-1 font-body text-xs font-medium text-danger hover:underline">
                    <Trash className="h-3 w-3" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <dialog
        ref={dialogRef}
        className="m-auto w-[min(480px,90vw)] rounded-xl border border-border bg-surface p-0 backdrop:bg-black/40"
        onClose={closeDialog}
      >
        <form onSubmit={handleSubmit} className="p-5 sm:p-6">
          <h2 className="font-heading text-lg font-bold text-fg mb-4">Add New Address</h2>
          <div className="space-y-3">
            <Field label="Label (e.g. Home, Office)" value={form.label} onChange={(v) => setForm((f) => ({ ...f, label: v }))} required />
            <Field label="Full Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} required />
            <Field label="Address Line 1" value={form.line1} onChange={(v) => setForm((f) => ({ ...f, line1: v }))} required />
            <Field label="Address Line 2 (optional)" value={form.line2} onChange={(v) => setForm((f) => ({ ...f, line2: v }))} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="City" value={form.city} onChange={(v) => setForm((f) => ({ ...f, city: v }))} required />
              <Field label="State" value={form.state} onChange={(v) => setForm((f) => ({ ...f, state: v }))} required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pincode" value={form.pincode} onChange={(v) => setForm((f) => ({ ...f, pincode: v }))} required />
              <Field label="Phone" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} required />
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="font-body text-sm font-semibold text-fg">Set as default</div>
                <div className="font-body text-xs text-muted-warm">Use this address for checkout</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={form.isDefault}
                onClick={() => setForm((f) => ({ ...f, isDefault: !f.isDefault }))}
                className={`relative h-[26px] w-[46px] shrink-0 rounded-full transition-colors ${form.isDefault ? 'bg-success' : 'bg-border'}`}
              >
                <span className={`absolute top-[3px] size-5 rounded-full bg-surface shadow transition-transform ${form.isDefault ? 'left-[23px]' : 'left-[3px]'}`} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-5">
            <button type="button" onClick={closeDialog} className="font-body text-sm font-medium text-muted-warm hover:text-fg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-store-primary px-5 py-2.5 font-body text-sm font-semibold text-white hover:bg-store-primary/90 transition-colors disabled:opacity-60"
            >
              {isPending ? 'Saving…' : 'Save Address'}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  required,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  required?: boolean
}) {
  return (
    <div>
      <label className="font-body text-xs font-medium text-muted-warm block mb-1.5">{label}</label>
      <input
        type="text"
        value={value}
        required={required}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-border bg-bg px-3.5 py-2.5 font-body text-base text-fg outline-none focus:border-store-primary focus:ring-1 focus:ring-store-primary"
      />
    </div>
  )
}
