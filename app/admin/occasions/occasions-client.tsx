'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Plus, X, ChevronUp, ChevronDown, GripVertical } from 'lucide-react'
import { Dialog } from '@/components/ui/dialog'
import { OCCASION_THEMES, SELECTABLE_OCCASION_THEMES } from '@/lib/occasion-themes'
import {
  getNewOccasionProductPicker,
  getOccasionProductPicker,
  createOccasionAction,
  deleteOccasion,
  setOccasionProducts,
  setOccasionSettings,
  setOccasionStatusAction,
} from './actions'

type OccasionRow = {
  id: string
  name: string
  slug: string
  emoji: string | null
  isDefault: boolean
  themeKey: string | null
  layout: 'grid' | 'carousel'
  status: string
  _count: { products: number }
}

type PickerProduct = { id: string; name: string; price: unknown; images: string[] }

/* ── Small controls ── */

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      title={disabled ? 'Add a product before turning this on' : undefined}
      className={`flex h-[26px] w-12 shrink-0 items-center rounded-full px-[2px] transition-colors ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'} ${checked ? 'bg-brand-primary' : 'bg-[#D1D5DB]'}`}
    >
      <div className={`size-[22px] rounded-full bg-surface shadow-sm transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0'}`} />
    </button>
  )
}

function ThemePicker({ value, onChange }: { value: string; onChange: (key: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-bold text-fg">Theme</span>
      <div className="flex flex-wrap gap-2.5">
        {SELECTABLE_OCCASION_THEMES.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            aria-label={key}
            className="size-9 shrink-0 rounded-full box-border"
            style={{
              backgroundImage: OCCASION_THEMES[key].gradient,
              border: value === key ? '2px solid var(--color-brand-primary)' : '2px solid transparent',
            }}
          />
        ))}
      </div>
    </div>
  )
}

function LayoutToggle({ value, onChange }: { value: 'grid' | 'carousel'; onChange: (v: 'grid' | 'carousel') => void }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-bold text-fg">Layout</span>
      <div className="flex w-fit gap-0.5 rounded-lg bg-bg p-0.5">
        {(['grid', 'carousel'] as const).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded-md px-4 py-1.5 text-sm capitalize ${
              value === option ? 'bg-surface font-semibold text-fg shadow-sm' : 'font-medium text-muted-warm'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Add/Edit modal ── */

function OccasionEditor({
  open, onClose, occasion, onSaved,
}: {
  open: boolean; onClose: () => void; occasion: OccasionRow | null; onSaved: () => void
}) {
  const isEdit = occasion !== null
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('')
  const [themeKey, setThemeKey] = useState<string>(SELECTABLE_OCCASION_THEMES[0])
  const [layout, setLayout] = useState<'grid' | 'carousel'>('grid')
  const [products, setProducts] = useState<PickerProduct[] | null>(null)
  const [order, setOrder] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setName(occasion?.name ?? '')
    setEmoji(occasion?.emoji ?? '')
    setThemeKey(occasion?.themeKey ?? SELECTABLE_OCCASION_THEMES[0])
    setLayout(occasion?.layout ?? 'grid')
    setProducts(null)

    const picker = isEdit ? getOccasionProductPicker(occasion.id) : getNewOccasionProductPicker()
    picker.then((rows) => {
      setProducts(rows as PickerProduct[])
      const assigned = (rows as { id: string; tagAssignments?: { id: string }[] }[]).filter((r) => (r.tagAssignments?.length ?? 0) > 0)
      setOrder(assigned.map((r) => r.id))
    })
  }, [open, occasion, isEdit])

  const toggle = (id: string) => setOrder((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))

  const move = (id: string, direction: -1 | 1) => {
    setOrder((prev) => {
      const index = prev.indexOf(id)
      const swapWith = index + direction
      if (swapWith < 0 || swapWith >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[swapWith]] = [next[swapWith], next[index]]
      return next
    })
  }

  async function handleSave() {
    if (!isEdit && !name.trim()) { setError('Name is required.'); return }
    if (order.length === 0) { setError('Select at least one product.'); return }

    setSaving(true)
    setError(null)
    const result = isEdit
      ? await Promise.all([setOccasionProducts(occasion.id, order), setOccasionSettings(occasion.id, { themeKey, layout })]).then(([a, b]) => a.error || b.error ? { error: a.error || b.error } : {})
      : await createOccasionAction({ name: name.trim(), emoji: emoji.trim() || undefined, themeKey, layout, productIds: order })
    setSaving(false)

    if (result.error) { setError(result.error); return }
    onSaved()
    onClose()
  }

  const byId = new Map((products ?? []).map((p) => [p.id, p]))
  const unassigned = (products ?? []).filter((p) => !order.includes(p.id))

  return (
    <Dialog open={open} onClose={onClose} className="md:max-w-[560px]">
      <div className="flex max-h-[95vh] flex-col md:max-h-[90vh]">
        <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
          <span className="text-base font-bold text-fg">{isEdit ? occasion.name : 'Add New Occasion'}</span>
          <button onClick={onClose} className="cursor-pointer transition-transform active:scale-90"><X className="size-6 text-muted-warm" /></button>
        </div>

        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex flex-col gap-5 p-4">
            {error && <div className="rounded-lg bg-danger/10 px-3 py-2 text-sm font-medium text-danger">{error}</div>}

            {!isEdit && (
              <div className="flex gap-3">
                <label className="flex w-20 shrink-0 flex-col gap-1.5">
                  <span className="text-sm font-bold text-fg">Emoji</span>
                  <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={2} placeholder="🪔" className="rounded-lg border border-border bg-bg px-3 py-[11px] text-center text-xl outline-none focus:border-brand-primary focus:bg-surface" />
                </label>
                <label className="flex flex-1 flex-col gap-1.5">
                  <span className="text-sm font-bold text-fg">Name *</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Wedding Season" className="rounded-lg border border-border bg-bg px-3 py-[11px] text-md outline-none focus:border-brand-primary focus:bg-surface" />
                </label>
              </div>
            )}

            <ThemePicker value={themeKey} onChange={setThemeKey} />
            <LayoutToggle value={layout} onChange={setLayout} />

            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold text-fg">Products * (min 1)</span>
              {products === null ? (
                <p className="py-4 text-center text-sm text-muted-warm">Loading products…</p>
              ) : (
                <div className="flex max-h-72 flex-col gap-1 overflow-y-auto">
                  {order.map((id, index) => {
                    const p = byId.get(id)
                    if (!p) return null
                    return (
                      <div key={id} className="flex items-center gap-2 rounded-md bg-bg px-2 py-1.5">
                        <GripVertical className="size-3.5 shrink-0 text-border" />
                        <span className="flex-1 text-sm text-fg">{p.name}</span>
                        <span className="text-xs text-muted-warm">₹{Number(p.price).toLocaleString('en-IN')}</span>
                        <button type="button" onClick={() => move(id, -1)} disabled={index === 0} className="text-muted-warm hover:text-fg disabled:opacity-30">
                          <ChevronUp className="size-3.5" />
                        </button>
                        <button type="button" onClick={() => move(id, 1)} disabled={index === order.length - 1} className="text-muted-warm hover:text-fg disabled:opacity-30">
                          <ChevronDown className="size-3.5" />
                        </button>
                        <button type="button" onClick={() => toggle(id)} className="text-muted-warm hover:text-danger">
                          <X className="size-3.5" />
                        </button>
                      </div>
                    )
                  })}
                  {unassigned.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-bg">
                      <input type="checkbox" checked={false} onChange={() => toggle(p.id)} className="size-4 rounded border-border accent-brand-primary" />
                      <span className="flex-1 text-sm text-fg">{p.name}</span>
                      <span className="text-xs text-muted-warm">₹{Number(p.price).toLocaleString('en-IN')}</span>
                    </label>
                  ))}
                  {products.length === 0 && <p className="py-4 text-center text-sm text-muted-warm">No active products yet.</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-border p-4">
          <button type="button" onClick={onClose} className="grow cursor-pointer rounded-lg border border-border py-3 text-md font-semibold text-fg transition-colors active:bg-bg">Cancel</button>
          <button type="button" onClick={handleSave} disabled={saving || products === null} className="grow cursor-pointer rounded-lg bg-brand-primary py-3 text-md font-semibold text-surface transition-transform active:scale-[0.98] disabled:opacity-60">
            {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Occasion'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}

/* ── Main page ── */

export function OccasionsClient({ initialOccasions }: { initialOccasions: OccasionRow[] }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [editorOpen, setEditorOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<OccasionRow | null>(null)
  const [error, setError] = useState<string | null>(null)

  const occasions = initialOccasions.filter((o) => o.name.toLowerCase().includes(search.toLowerCase()))

  function openAdd() { setEditTarget(null); setEditorOpen(true) }
  function openEdit(o: OccasionRow) { setEditTarget(o); setEditorOpen(true) }

  async function toggleStatus(o: OccasionRow) {
    const result = await setOccasionStatusAction(o.id, o.status !== 'published')
    if (result.error) { setError(result.error); return }
    setError(null)
    router.refresh()
  }

  async function handleDelete(o: OccasionRow) {
    const result = await deleteOccasion(o.id)
    if (result.error) { setError(result.error); return }
    setError(null)
    router.refresh()
  }

  return (
    <div className="px-4 pb-24 md:px-0 md:pb-0">
      <div className="mb-1 flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-3 shadow-sm">
        <Search className="size-[18px] text-muted-warm" />
        <input className="grow bg-transparent text-md outline-none placeholder:text-muted-warm" placeholder="Search occasions..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      <p className="mb-3 text-xs text-muted-warm">
        Occasions power the storefront&apos;s &quot;Shop by Occasion&quot; strip and each occasion&apos;s own page. Default festivals can&apos;t be deleted, but every occasion can be turned on or off.
      </p>

      {error && <p className="mb-3 rounded-lg bg-danger/5 px-3 py-2 text-sm text-danger">{error}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {occasions.map((o) => {
          const theme = o.themeKey ? OCCASION_THEMES[o.themeKey] : undefined
          const live = o.status === 'published'
          return (
            <div key={o.id} className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
              <div className="flex h-16 items-center justify-center text-3xl" style={{ backgroundImage: theme?.gradient ?? 'linear-gradient(135deg, #6d4c41, #3e2723)' }}>
                {o.emoji || '🎉'}
              </div>
              <div className="flex flex-col gap-2 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-md font-semibold text-fg">{o.name}</p>
                  <Toggle checked={live} disabled={!live && o._count.products === 0} onChange={() => toggleStatus(o)} />
                </div>
                <p className="text-xs text-muted-warm capitalize">
                  {o._count.products} product{o._count.products === 1 ? '' : 's'} · {o.layout} · {live ? 'Live' : 'Off'}
                  {o.isDefault && <span className="ml-1.5 rounded-full bg-brand-primary/10 px-2 py-0.5 text-2xs font-semibold text-brand-primary">Default</span>}
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => openEdit(o)} className="flex-1 cursor-pointer rounded-lg border border-border py-1.5 text-xs font-semibold text-fg hover:bg-bg">Configure</button>
                  {!o.isDefault && (
                    <button type="button" onClick={() => handleDelete(o)} className="cursor-pointer rounded-lg border border-border px-2.5 text-muted-warm hover:border-danger hover:text-danger">
                      <X className="size-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {occasions.length === 0 && <p className="col-span-full py-12 text-center text-sm text-muted-warm">No occasions found.</p>}
      </div>

      <button onClick={openAdd} className="fixed bottom-24 right-4 z-30 flex size-14 cursor-pointer items-center justify-center rounded-full bg-brand-primary shadow-lg transition-transform active:scale-90 md:bottom-8 md:right-8">
        <Plus className="size-7 text-surface" />
      </button>

      <OccasionEditor open={editorOpen} onClose={() => setEditorOpen(false)} occasion={editTarget} onSaved={() => router.refresh()} />
    </div>
  )
}
