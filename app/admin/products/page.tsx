'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, SlidersHorizontal, MoreHorizontal, Plus, X, Minus, ChevronDown, Check } from 'lucide-react'

type MockProduct = {
  id: string
  name: string
  price: string
  stockLabel: string
  stockColor: string
  stockFilter: 'in_stock' | 'low' | 'out'
  bg: string
  iconColor: string
}

const MOCK_PRODUCTS: MockProduct[] = [
  { id: 'p1', name: 'Cotton Kurta Set', price: '₹1,299', stockLabel: 'In stock', stockColor: 'text-success', stockFilter: 'in_stock', bg: 'bg-[#EDE9FE]', iconColor: 'text-brand-primary' },
  { id: 'p2', name: 'Silk Banarasi Saree', price: '₹3,499', stockLabel: 'Low (3 left)', stockColor: 'text-amber', stockFilter: 'low', bg: 'bg-[#FEF3C7]', iconColor: 'text-amber' },
  { id: 'p3', name: 'Anarkali Suit', price: '₹2,199', stockLabel: 'Out of stock', stockColor: 'text-danger', stockFilter: 'out', bg: 'bg-[#DBEAFE]', iconColor: 'text-brand-primary' },
]

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']

function BagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 01-8 0" />
    </svg>
  )
}

function SizeMultiSelect({ selected, onChange }: { selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function toggle(size: string) {
    onChange(selected.includes(size) ? selected.filter((s) => s !== size) : [...selected, size])
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center justify-between rounded-lg border border-border px-3 py-[11px] text-md text-fg"
      >
        <span className={selected.length ? 'text-fg' : 'text-muted-warm'}>
          {selected.length ? selected.join(', ') : 'Select sizes'}
        </span>
        <ChevronDown className={`size-4 text-muted-warm transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-border bg-surface shadow-lg">
          {ALL_SIZES.map((size) => {
            const active = selected.includes(size)
            return (
              <button
                key={size}
                type="button"
                onClick={() => toggle(size)}
                className="flex w-full cursor-pointer items-center justify-between px-3 py-[10px] text-sm transition-colors hover:bg-bg"
              >
                <span className={active ? 'font-semibold text-fg' : 'text-fg'}>{size}</span>
                {active && <Check className="size-4 text-brand-primary" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

type FilterState = 'all' | 'in_stock' | 'low' | 'out'

export default function AdminProductsPage() {
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorVisible, setEditorVisible] = useState(false)
  const [specs, setSpecs] = useState([{ key: '', value: '' }])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<FilterState>('all')
  const [filterOpen, setFilterOpen] = useState(false)

  function openEditor() {
    setEditorOpen(true)
    requestAnimationFrame(() => setEditorVisible(true))
  }

  function closeEditor() {
    setEditorVisible(false)
    setTimeout(() => setEditorOpen(false), 250)
  }

  const filtered = MOCK_PRODUCTS.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (stockFilter !== 'all' && p.stockFilter !== stockFilter) return false
    return true
  })

  return (
    <div className="relative mx-auto max-w-[390px] md:max-w-none">
      {/* Search bar */}
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-10 grow items-center gap-2 rounded-lg border border-border px-3">
          <Search className="size-[18px] text-muted-warm" />
          <input
            className="grow bg-transparent text-md outline-none"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-border transition-colors hover:bg-bg"
          >
            <SlidersHorizontal className="size-[18px] text-muted-warm" />
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-border bg-surface shadow-lg">
              {([['all', 'All'], ['in_stock', 'In Stock'], ['low', 'Low Stock'], ['out', 'Out of Stock']] as const).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => { setStockFilter(key); setFilterOpen(false) }}
                  className={`flex w-full cursor-pointer items-center justify-between px-3 py-[10px] text-sm transition-colors hover:bg-bg ${stockFilter === key ? 'font-semibold text-brand-primary' : 'text-fg'}`}
                >
                  {label}
                  {stockFilter === key && <Check className="size-4 text-brand-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Count + category */}
      <div className="flex items-center justify-between px-4 py-2">
        <span className="text-sm text-muted-warm">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</span>
        <span className="text-sm text-muted-warm">{stockFilter === 'all' ? 'All categories' : stockFilter === 'in_stock' ? 'In Stock' : stockFilter === 'low' ? 'Low Stock' : 'Out of Stock'}</span>
      </div>

      {/* Product list */}
      <div>
        {filtered.map((product) => (
          <div key={product.id} className="flex cursor-pointer items-center gap-3 border-b border-border px-4 py-[18px] transition-colors active:bg-bg md:hover:bg-bg">
            <div className={`flex size-12 shrink-0 items-center justify-center rounded-xl ${product.bg}`}>
              <BagIcon className={`size-6 ${product.iconColor}`} />
            </div>
            <div className="min-w-0 grow">
              <p className="truncate text-md font-semibold text-fg">{product.name}</p>
              <p className="text-md text-fg">{product.price}</p>
              <p className={`text-sm font-semibold ${product.stockColor}`}>{product.stockLabel}</p>
            </div>
            <button onClick={() => openEditor()} className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border transition-colors hover:bg-bg">
              <MoreHorizontal className="size-4 text-muted-warm" />
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center text-sm text-muted-warm">No products found</div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={openEditor}
        className="fixed bottom-24 right-4 z-30 flex size-14 cursor-pointer items-center justify-center rounded-full bg-brand-primary shadow-lg transition-transform active:scale-90 md:bottom-8 md:right-8"
      >
        <Plus className="size-7 text-surface" />
      </button>

      {/* Product Editor — fixed header, scrollable body, fixed footer */}
      {editorOpen && (
        <div
          className={`fixed inset-0 z-40 flex items-end bg-black/50 transition-opacity duration-250 md:items-center md:justify-center ${editorVisible ? 'opacity-100' : 'opacity-0'}`}
          onClick={(e) => { if (e.target === e.currentTarget) closeEditor() }}
        >
          <div
            className={`flex max-h-[95vh] w-full flex-col rounded-t-2xl bg-surface transition-transform duration-250 ease-out md:max-h-[90vh] md:max-w-lg md:rounded-2xl ${
              editorVisible ? 'translate-y-0 md:scale-100' : 'translate-y-full md:translate-y-0 md:scale-95'
            }`}
          >
            {/* Sticky header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
              <span className="text-base font-bold text-fg">Add Product</span>
              <button onClick={closeEditor} className="cursor-pointer transition-transform active:scale-90">
                <X className="size-6 text-muted-warm" />
              </button>
            </div>

            {/* Scrollable form content */}
            <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <form className="flex flex-col gap-5 p-4" onSubmit={(e) => e.preventDefault()}>
                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-fg">Product Name *</span>
                  <input required name="name" className="rounded-lg border border-border px-3 py-[11px] text-md" placeholder="e.g., Cotton Kurta Set" />
                </label>

                <label className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-fg">Description</span>
                  <textarea name="description" className="h-[90px] resize-none rounded-lg border border-border px-3 py-[11px] text-md" placeholder="Add product details, features, care instructions..." />
                </label>

                {/* Category + Sub Category: stacked on mobile, side-by-side on desktop */}
                <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-fg">Category *</span>
                    <select required name="categoryId" className="cursor-pointer rounded-lg border border-border px-3 py-[11px] text-md">
                      <option value="">Select category</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-fg">Sub Category</span>
                    <select name="subCategoryId" className="cursor-pointer rounded-lg border border-border px-3 py-[11px] text-md">
                      <option value="">Select sub-category</option>
                    </select>
                  </label>
                </div>

                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-fg">Product Pictures * (Min 1, Max 5)</span>
                  <label className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-border bg-bg px-4 py-7 transition-colors hover:border-brand-primary">
                    <input type="file" name="images" accept="image/*" multiple className="hidden" />
                    <svg viewBox="0 0 24 24" className="mb-2 size-8 text-muted-warm" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <circle cx="8.5" cy="8.5" r="1.5" />
                      <polyline points="21 15 16 10 5 21" />
                    </svg>
                    <span className="text-sm font-medium text-fg">Tap to upload</span>
                    <span className="text-2xs text-muted-warm">PNG, JPG, up to 5MB each</span>
                  </label>
                </div>

                {/* Price + Discount: stacked on mobile, side-by-side on desktop */}
                <div className="flex flex-col gap-4 md:grid md:grid-cols-2 md:gap-3">
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-fg">Price *</span>
                    <div className="flex items-center">
                      <span className="rounded-l-lg border border-r-0 border-border bg-bg px-3 py-[11px] text-muted-warm">₹</span>
                      <input required type="number" name="price" className="grow rounded-r-lg border border-border px-3 py-[11px] text-md" placeholder="1,299" />
                    </div>
                  </label>
                  <label className="flex flex-col gap-2">
                    <span className="text-sm font-semibold text-fg">Price After Discount</span>
                    <div className="flex items-center">
                      <span className="rounded-l-lg border border-r-0 border-border bg-bg px-3 py-[11px] text-muted-warm">₹</span>
                      <input type="number" name="comparePrice" className="grow rounded-r-lg border border-border px-3 py-[11px] text-md" placeholder="999" />
                    </div>
                  </label>
                </div>

                {/* Sizes — dropdown multiselect */}
                <div className="flex flex-col gap-2">
                  <span className="text-sm font-semibold text-fg">Sizes Available</span>
                  <SizeMultiSelect selected={selectedSizes} onChange={setSelectedSizes} />
                </div>

                <label className="flex cursor-pointer items-center gap-[10px] rounded-lg bg-bg p-3">
                  <input type="checkbox" name="couponApplicable" className="size-[13px] rounded-sm border border-[#C7C7C7]" />
                  <span className="text-sm font-semibold text-fg">Coupon Applicable</span>
                </label>

                {/* Product Specifications */}
                <div className="flex flex-col gap-3">
                  <span className="text-sm font-semibold text-fg">Product Specifications</span>
                  {specs.map((spec, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        className="grow rounded-lg border border-border px-3 py-[9px] text-sm"
                        placeholder="Key (e.g., Material)"
                        value={spec.key}
                        onChange={(e) => { const s = [...specs]; s[i].key = e.target.value; setSpecs(s) }}
                      />
                      <input
                        className="grow rounded-lg border border-border px-3 py-[9px] text-sm"
                        placeholder="Value (e.g., Cotton)"
                        value={spec.value}
                        onChange={(e) => { const s = [...specs]; s[i].value = e.target.value; setSpecs(s) }}
                      />
                      <button type="button" onClick={() => setSpecs(specs.filter((_, j) => j !== i))} className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-danger text-danger transition-colors hover:bg-danger/10">
                        <Minus className="size-4" />
                      </button>
                    </div>
                  ))}
                  <button type="button" onClick={() => setSpecs([...specs, { key: '', value: '' }])} className="cursor-pointer text-left text-sm font-semibold text-brand-primary">
                    + Add Specification
                  </button>
                </div>
              </form>
            </div>

            {/* Fixed footer */}
            <div className="flex shrink-0 gap-3 border-t border-border p-4">
              <button type="button" onClick={closeEditor} className="grow cursor-pointer rounded-lg border border-border p-3 text-md font-semibold text-fg transition-colors active:bg-bg">
                Cancel
              </button>
              <button type="submit" className="grow cursor-pointer rounded-lg bg-brand-primary p-3 text-md font-semibold text-surface transition-transform active:scale-[0.98]">
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
