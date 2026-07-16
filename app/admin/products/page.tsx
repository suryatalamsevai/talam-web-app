'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, SlidersHorizontal, MoreHorizontal, Plus, X, Minus, Check, Image as ImageIcon } from 'lucide-react'

/* ── Types & mock data ── */

type StockFilter = 'in_stock' | 'low' | 'out'
type SortKey = 'newest' | 'popular' | 'bought' | 'price_asc' | 'price_desc'
type CategoryFilter = 'top' | 'new' | 'by_category' | 'active_only'

type MockProduct = {
  id: string; name: string; price: string; priceNum: number; stockLabel: string
  stockColor: string; stockFilter: StockFilter; status: string; statusColor: string
  bg: string; iconColor: string
}

const MOCK_PRODUCTS: MockProduct[] = [
  { id: 'p1', name: 'Cotton Kurta Set', price: '₹1,299', priceNum: 1299, stockLabel: 'In stock', stockColor: 'text-success', stockFilter: 'in_stock', status: 'Active', statusColor: 'bg-success/10 text-success', bg: 'bg-[#FBEAE3]', iconColor: 'text-brand-primary' },
  { id: 'p2', name: 'Silk Banarasi Saree', price: '₹3,499', priceNum: 3499, stockLabel: 'Low (3)', stockColor: 'text-amber', stockFilter: 'low', status: 'Active', statusColor: 'bg-success/10 text-success', bg: 'bg-[#FEF3C7]', iconColor: 'text-amber' },
  { id: 'p3', name: 'Anarkali Suit', price: '₹2,199', priceNum: 2199, stockLabel: 'Out of stock', stockColor: 'text-danger', stockFilter: 'out', status: 'Active', statusColor: 'bg-success/10 text-success', bg: 'bg-[#DBEAFE]', iconColor: 'text-brand-primary' },
]

const CATEGORY_OPTIONS: { key: CategoryFilter; label: string }[] = [
  { key: 'top', label: 'Top Products' },
  { key: 'new', label: 'Newly Added' },
  { key: 'by_category', label: 'Products by Category' },
  { key: 'active_only', label: 'Active Stock Only' },
]

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'newest', label: 'Newest First' },
  { key: 'popular', label: 'Most Popular' },
  { key: 'bought', label: 'Most Bought' },
  { key: 'price_asc', label: 'Price: Low to High' },
  { key: 'price_desc', label: 'Price: High to Low' },
]

const STOCK_OPTIONS: { key: StockFilter; label: string }[] = [
  { key: 'in_stock', label: 'In Stock' },
  { key: 'low', label: 'Low Stock' },
  { key: 'out', label: 'Out of Stock' },
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

/* ── Filter chips ── */

type ActiveFilter = { key: string; label: string }

function FilterChips({ filters, onRemove, onClearAll }: { filters: ActiveFilter[]; onRemove: (key: string) => void; onClearAll: () => void }) {
  if (filters.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pb-3 md:px-0">
      {filters.map((f) => (
        <button key={f.key} onClick={() => onRemove(f.key)} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs font-semibold text-fg transition-colors hover:bg-bg">
          {f.label}
          <X className="size-3 text-muted-warm" />
        </button>
      ))}
      <button onClick={onClearAll} className="cursor-pointer text-xs font-semibold text-brand-primary">Clear all</button>
    </div>
  )
}

/* ── Desktop sidebar filter panel ── */

function DesktopFilters({
  categories, stockFilters, sort, priceMin, priceMax,
  onToggleCategory, onToggleStock, onSetSort, onPriceMin, onPriceMax, onReset,
}: {
  categories: Set<CategoryFilter>; stockFilters: Set<StockFilter>; sort: SortKey
  priceMin: string; priceMax: string
  onToggleCategory: (k: CategoryFilter) => void; onToggleStock: (k: StockFilter) => void
  onSetSort: (k: SortKey) => void; onPriceMin: (v: string) => void; onPriceMax: (v: string) => void
  onReset: () => void
}) {
  return (
    <aside className="hidden w-[220px] shrink-0 md:block">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold uppercase tracking-[0.06em] text-fg">Filters</p>
        <button onClick={onReset} className="cursor-pointer text-xs font-semibold text-brand-primary">Reset</button>
      </div>

      <div className="mb-5">
        <p className="mb-2 text-2xs font-bold uppercase tracking-[0.06em] text-muted-warm">Category</p>
        {CATEGORY_OPTIONS.map((o) => (
          <label key={o.key} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-fg">
            <input type="checkbox" checked={categories.has(o.key)} onChange={() => onToggleCategory(o.key)} className="size-4 rounded border-border accent-brand-primary" />
            {o.label}
          </label>
        ))}
      </div>

      <div className="mb-5">
        <p className="mb-2 text-2xs font-bold uppercase tracking-[0.06em] text-muted-warm">Sort By</p>
        {SORT_OPTIONS.map((o) => (
          <label key={o.key} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-fg">
            <input type="radio" name="sort" checked={sort === o.key} onChange={() => onSetSort(o.key)} className="size-4 accent-brand-primary" />
            {o.label}
          </label>
        ))}
      </div>

      <div className="mb-5">
        <p className="mb-2 text-2xs font-bold uppercase tracking-[0.06em] text-muted-warm">Price Range</p>
        <div className="flex items-center gap-2">
          <input value={priceMin} onChange={(e) => onPriceMin(e.target.value)} placeholder="Min" className="w-full rounded-lg border border-border px-2.5 py-2 text-sm" />
          <span className="text-muted-warm">–</span>
          <input value={priceMax} onChange={(e) => onPriceMax(e.target.value)} placeholder="Max" className="w-full rounded-lg border border-border px-2.5 py-2 text-sm" />
        </div>
      </div>

      <div>
        <p className="mb-2 text-2xs font-bold uppercase tracking-[0.06em] text-muted-warm">Stock Status</p>
        {STOCK_OPTIONS.map((o) => (
          <label key={o.key} className="flex cursor-pointer items-center gap-2.5 py-1.5 text-sm text-fg">
            <input type="checkbox" checked={stockFilters.has(o.key)} onChange={() => onToggleStock(o.key)} className="size-4 rounded border-border accent-brand-primary" />
            {o.label}
          </label>
        ))}
      </div>
    </aside>
  )
}

/* ── Mobile filter bottom sheet ── */

function MobileFilterSheet({
  open, onClose,
  categories, stockFilters, sort, priceMin, priceMax,
  onToggleCategory, onToggleStock, onSetSort, onPriceMin, onPriceMax, onReset, onApply,
}: {
  open: boolean; onClose: () => void
  categories: Set<CategoryFilter>; stockFilters: Set<StockFilter>; sort: SortKey
  priceMin: string; priceMax: string
  onToggleCategory: (k: CategoryFilter) => void; onToggleStock: (k: StockFilter) => void
  onSetSort: (k: SortKey) => void; onPriceMin: (v: string) => void; onPriceMax: (v: string) => void
  onReset: () => void; onApply: () => void
}) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true))
    else setVisible(false)
  }, [open])

  if (!open) return null

  return (
    <div className={`fixed inset-0 z-50 flex items-end bg-black/50 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0'}`} onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className={`w-full max-h-[85vh] flex flex-col rounded-t-2xl bg-surface transition-transform duration-250 ease-out ${visible ? 'translate-y-0' : 'translate-y-full'}`}>
        <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
          <span className="text-lg font-bold text-fg">Filters</span>
          <button onClick={onReset} className="cursor-pointer text-sm font-semibold text-brand-primary">Reset</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="mb-5">
            <p className="mb-2 text-2xs font-bold uppercase tracking-[0.06em] text-muted-warm">Category</p>
            {CATEGORY_OPTIONS.map((o) => (
              <label key={o.key} className="flex cursor-pointer items-center gap-2.5 py-2 text-sm text-fg">
                <input type="checkbox" checked={categories.has(o.key)} onChange={() => onToggleCategory(o.key)} className="size-4 rounded border-border accent-brand-primary" />
                {o.label}
              </label>
            ))}
          </div>

          <div className="mb-5">
            <p className="mb-2 text-2xs font-bold uppercase tracking-[0.06em] text-muted-warm">Sort By</p>
            {SORT_OPTIONS.map((o) => (
              <label key={o.key} className="flex cursor-pointer items-center gap-2.5 py-2 text-sm text-fg">
                <input type="radio" name="mobileSort" checked={sort === o.key} onChange={() => onSetSort(o.key)} className="size-4 accent-brand-primary" />
                {o.label}
              </label>
            ))}
          </div>

          <div className="mb-5">
            <p className="mb-2 text-2xs font-bold uppercase tracking-[0.06em] text-muted-warm">Price Range</p>
            <div className="flex items-center gap-2">
              <input value={priceMin} onChange={(e) => onPriceMin(e.target.value)} placeholder="Min" className="w-full rounded-lg border border-border px-3 py-[11px] text-sm" />
              <span className="text-muted-warm">–</span>
              <input value={priceMax} onChange={(e) => onPriceMax(e.target.value)} placeholder="Max" className="w-full rounded-lg border border-border px-3 py-[11px] text-sm" />
            </div>
          </div>

          <div>
            <p className="mb-2 text-2xs font-bold uppercase tracking-[0.06em] text-muted-warm">Stock Status</p>
            {STOCK_OPTIONS.map((o) => (
              <label key={o.key} className="flex cursor-pointer items-center gap-2.5 py-2 text-sm text-fg">
                <input type="checkbox" checked={stockFilters.has(o.key)} onChange={() => onToggleStock(o.key)} className="size-4 rounded border-border accent-brand-primary" />
                {o.label}
              </label>
            ))}
          </div>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-border p-4">
          <button onClick={onClose} className="grow cursor-pointer rounded-lg border border-border py-3 text-sm font-semibold text-fg transition-colors active:bg-bg">Cancel</button>
          <button onClick={onApply} className="grow cursor-pointer rounded-lg bg-brand-primary py-3 text-sm font-semibold text-surface transition-transform active:scale-[0.98]">Apply Filters</button>
        </div>
      </div>
    </div>
  )
}

/* ── Product editor modal (Add / Edit) ── */

function ProductEditor({ open, onClose, editProduct }: { open: boolean; onClose: () => void; editProduct: MockProduct | null }) {
  const [visible, setVisible] = useState(false)
  const [specs, setSpecs] = useState([{ key: '', value: '' }])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])

  useEffect(() => {
    if (open) requestAnimationFrame(() => setVisible(true))
    else setVisible(false)
  }, [open])

  if (!open) return null

  const isEdit = editProduct !== null
  const title = isEdit ? 'Edit Product' : 'Add New Product'
  const submitLabel = isEdit ? 'Save Changes' : 'Add Product'

  return (
    <div
      className={`fixed inset-0 z-50 flex items-end bg-black/50 transition-opacity duration-200 md:items-center md:justify-center ${visible ? 'opacity-100' : 'opacity-0'}`}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={`flex max-h-[95vh] w-full flex-col rounded-t-2xl bg-surface transition-transform duration-250 ease-out md:max-h-[90vh] md:max-w-[560px] md:rounded-2xl ${visible ? 'translate-y-0 md:scale-100' : 'translate-y-full md:translate-y-0 md:scale-95'}`}>
        <div className="flex shrink-0 items-center justify-between border-b border-border p-4">
          <span className="text-base font-bold text-fg">{title}</span>
          <button onClick={onClose} className="cursor-pointer transition-transform active:scale-90"><X className="size-6 text-muted-warm" /></button>
        </div>

        <div className="flex-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <form className="flex flex-col gap-5 p-4" onSubmit={(e) => e.preventDefault()}>
            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-fg">Product Name *</span>
              <input required defaultValue={isEdit ? editProduct.name : ''} className="rounded-lg border border-border px-3 py-[11px] text-md outline-none transition-colors focus:border-brand-primary" placeholder="e.g., Premium Cotton Kurta Set" />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-fg">Description</span>
              <textarea defaultValue={isEdit ? 'Hand block-printed cotton kurti with breathable fabric.' : ''} className="h-[100px] resize-none rounded-lg border border-border px-3 py-[11px] text-md outline-none transition-colors focus:border-brand-primary" placeholder="Add product details, features, care instructions, fabric information..." />
            </label>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold text-fg">Category *</span>
                <select required className="cursor-pointer rounded-lg border border-border px-3 py-[11px] text-md outline-none transition-colors focus:border-brand-primary">
                  <option value="">Select category</option>
                  {isEdit && <option selected>Kurtis</option>}
                </select>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold text-fg">Sub Category</span>
                <select className="cursor-pointer rounded-lg border border-border px-3 py-[11px] text-md outline-none transition-colors focus:border-brand-primary">
                  <option value="">Select sub-category</option>
                </select>
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold text-fg">Price *</span>
                <div className="flex">
                  <span className="flex items-center rounded-l-lg border border-r-0 border-border bg-bg px-3 text-sm text-muted-warm">₹</span>
                  <input required type="number" defaultValue={isEdit ? '649' : ''} className="grow rounded-r-lg border border-border px-3 py-[11px] text-md outline-none transition-colors focus:border-brand-primary" placeholder="1,299" />
                </div>
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-sm font-bold text-fg">Price After Discount</span>
                <div className="flex">
                  <span className="flex items-center rounded-l-lg border border-r-0 border-border bg-bg px-3 text-sm text-muted-warm">₹</span>
                  <input type="number" defaultValue={isEdit ? '549' : ''} className="grow rounded-r-lg border border-border px-3 py-[11px] text-md outline-none transition-colors focus:border-brand-primary" placeholder="999" />
                </div>
              </label>
            </div>

            <label className="flex flex-col gap-1.5 md:w-1/2 md:pr-1.5">
              <span className="text-sm font-bold text-fg">Quantity *</span>
              <input required type="number" defaultValue={isEdit ? '42' : ''} className="rounded-lg border border-border px-3 py-[11px] text-md outline-none transition-colors focus:border-brand-primary" placeholder="e.g., 25" />
            </label>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-fg">Product Pictures * (Min 1, Max 5)</span>
              {isEdit && (
                <div className="mb-1 flex gap-2">
                  <div className="relative size-16 rounded-lg bg-store-primary/30">
                    <button type="button" className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-fg text-surface"><X className="size-3" /></button>
                  </div>
                </div>
              )}
              <label className="flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed border-border bg-bg px-4 py-6 transition-colors hover:border-brand-primary">
                <input type="file" accept="image/*" multiple className="hidden" />
                <ImageIcon className="mb-1.5 size-7 text-muted-warm" strokeWidth={1.5} />
                <span className="text-sm font-medium text-fg">{isEdit ? 'Click to add more photos' : 'Click to upload or drag and drop'}</span>
                <span className="text-2xs text-muted-warm">PNG, JPG, GIF up to 5MB each</span>
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-bold text-fg">Sizes Available</span>
              <div className="flex flex-wrap gap-3">
                {ALL_SIZES.map((size) => (
                  <label key={size} className="flex cursor-pointer items-center gap-1.5 text-sm text-fg">
                    <input type="checkbox" checked={selectedSizes.includes(size)} onChange={() => setSelectedSizes(prev => prev.includes(size) ? prev.filter(s => s !== size) : [...prev, size])} className="size-4 rounded border-border accent-brand-primary" />
                    {size}
                  </label>
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2.5 rounded-lg bg-bg p-3">
              <input type="checkbox" className="size-4 rounded border-border accent-brand-primary" />
              <span className="text-sm font-semibold text-fg">Coupon Applicable</span>
            </label>

            <div className="flex flex-col gap-3">
              <span className="text-sm font-bold text-fg">Product Specifications</span>
              {specs.map((spec, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input className="grow rounded-lg border border-border px-3 py-[9px] text-sm outline-none focus:border-brand-primary" placeholder="Key (e.g., Material)" value={spec.key} onChange={(e) => { const s = [...specs]; s[i].key = e.target.value; setSpecs(s) }} />
                  <input className="grow rounded-lg border border-border px-3 py-[9px] text-sm outline-none focus:border-brand-primary" placeholder="Value (e.g., Cotton)" value={spec.value} onChange={(e) => { const s = [...specs]; s[i].value = e.target.value; setSpecs(s) }} />
                  <button type="button" onClick={() => setSpecs(specs.filter((_, j) => j !== i))} className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-danger text-danger transition-colors hover:bg-danger/10">
                    <Minus className="size-4" />
                  </button>
                </div>
              ))}
              <button type="button" onClick={() => setSpecs([...specs, { key: '', value: '' }])} className="cursor-pointer text-left text-sm font-semibold text-brand-primary">+ Add Specification</button>
            </div>
          </form>
        </div>

        <div className="flex shrink-0 gap-3 border-t border-border p-4">
          <button type="button" onClick={onClose} className="grow cursor-pointer rounded-lg border border-border py-3 text-md font-semibold text-fg transition-colors active:bg-bg">Cancel</button>
          <button type="submit" className="grow cursor-pointer rounded-lg bg-brand-primary py-3 text-md font-semibold text-surface transition-transform active:scale-[0.98]">{submitLabel}</button>
        </div>
      </div>
    </div>
  )
}

/* ── Main page ── */

export default function AdminProductsPage() {
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<Set<CategoryFilter>>(new Set())
  const [stockFilters, setStockFilters] = useState<Set<StockFilter>>(new Set())
  const [sort, setSort] = useState<SortKey>('price_desc')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<MockProduct | null>(null)

  function toggleCategory(k: CategoryFilter) { setCategories(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n }) }
  function toggleStock(k: StockFilter) { setStockFilters(prev => { const n = new Set(prev); n.has(k) ? n.delete(k) : n.add(k); return n }) }

  function resetFilters() {
    setCategories(new Set()); setStockFilters(new Set()); setSort('price_desc'); setPriceMin(''); setPriceMax('')
  }

  const activeFilters: ActiveFilter[] = [
    ...Array.from(categories).map(k => ({ key: `cat-${k}`, label: CATEGORY_OPTIONS.find(o => o.key === k)!.label })),
    ...Array.from(stockFilters).map(k => ({ key: `stock-${k}`, label: STOCK_OPTIONS.find(o => o.key === k)!.label })),
  ]

  function removeChip(key: string) {
    if (key.startsWith('cat-')) { const k = key.slice(4) as CategoryFilter; setCategories(prev => { const n = new Set(prev); n.delete(k); return n }) }
    if (key.startsWith('stock-')) { const k = key.slice(6) as StockFilter; setStockFilters(prev => { const n = new Set(prev); n.delete(k); return n }) }
  }

  const filtered = MOCK_PRODUCTS.filter((p) => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
    if (stockFilters.size > 0 && !stockFilters.has(p.stockFilter)) return false
    if (priceMin && p.priceNum < Number(priceMin)) return false
    if (priceMax && p.priceNum > Number(priceMax)) return false
    return true
  })

  function openAdd() { setEditProduct(null); setEditorOpen(true) }
  function openEdit(p: MockProduct) { setEditProduct(p); setEditorOpen(true) }

  return (
    <div className="px-4 pb-24 md:px-0 md:pb-0">

      {/* Search + filter button */}
      <div className="flex items-center gap-2 pb-3">
        <div className="flex h-10 grow items-center gap-2 rounded-lg border border-border bg-surface px-3">
          <Search className="size-[18px] text-muted-warm" />
          <input className="grow bg-transparent text-md outline-none placeholder:text-muted-warm" placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {/* Mobile: opens bottom sheet */}
        <button onClick={() => setMobileFilterOpen(true)} className="flex size-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface transition-colors hover:bg-bg md:hidden">
          <SlidersHorizontal className="size-[18px] text-muted-warm" />
        </button>
        {/* Desktop: filter button (sidebar is always visible, this is for consistency) */}
        <button className="hidden size-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-surface transition-colors hover:bg-bg md:flex">
          <SlidersHorizontal className="size-[18px] text-muted-warm" />
        </button>
      </div>

      {/* Count + category label */}
      <div className="flex items-center justify-between pb-2">
        <span className="text-sm text-muted-warm">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</span>
        <span className="text-sm text-muted-warm">All categories</span>
      </div>

      {/* Filter chips */}
      <FilterChips filters={activeFilters} onRemove={removeChip} onClearAll={resetFilters} />

      {/* Desktop: sidebar + table */}
      <div className="md:flex md:gap-8">
        <DesktopFilters
          categories={categories} stockFilters={stockFilters} sort={sort}
          priceMin={priceMin} priceMax={priceMax}
          onToggleCategory={toggleCategory} onToggleStock={toggleStock} onSetSort={setSort}
          onPriceMin={setPriceMin} onPriceMax={setPriceMax} onReset={resetFilters}
        />

        <div className="min-w-0 flex-1">
          {/* Desktop table */}
          <div className="hidden md:block">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-x-4 border-b border-border pb-2 text-2xs font-bold uppercase tracking-[0.06em] text-muted-warm">
              <span>Product Name</span>
              <span>Price</span>
              <span>Stock</span>
              <span>Status</span>
              <span>Actions</span>
            </div>
            {filtered.map((p) => (
              <div key={p.id} className="grid cursor-pointer grid-cols-[2fr_1fr_1fr_1fr_auto] items-center gap-x-4 border-b border-border-light py-3 transition-colors hover:bg-bg">
                <div className="flex items-center gap-3">
                  <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${p.bg}`}>
                    <BagIcon className={`size-5 ${p.iconColor}`} />
                  </div>
                  <span className="truncate text-sm font-semibold text-fg">{p.name}</span>
                </div>
                <span className="text-sm text-fg">{p.price}</span>
                <span className={`text-sm font-semibold ${p.stockColor}`}>{p.stockLabel}</span>
                <span className={`inline-flex w-fit rounded-full px-2.5 py-0.5 text-2xs font-semibold ${p.statusColor}`}>{p.status}</span>
                <button onClick={() => openEdit(p)} className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border transition-colors hover:bg-bg">
                  <MoreHorizontal className="size-4 text-muted-warm" />
                </button>
              </div>
            ))}
            {filtered.length === 0 && <p className="py-12 text-center text-sm text-muted-warm">No products found</p>}
          </div>

          {/* Mobile list */}
          <div className="md:hidden">
            {filtered.map((p) => (
              <div key={p.id} className="flex cursor-pointer items-center gap-3 border-b border-border-light py-3.5 transition-colors active:bg-bg">
                <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${p.bg}`}>
                  <BagIcon className={`size-5 ${p.iconColor}`} />
                </div>
                <div className="min-w-0 grow">
                  <p className="truncate text-sm font-semibold text-fg">{p.name}</p>
                  <p className="text-sm text-fg">{p.price}</p>
                  <p className={`text-xs font-semibold ${p.stockColor}`}>{p.stockLabel}</p>
                </div>
                <button onClick={() => openEdit(p)} className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border transition-colors hover:bg-bg">
                  <MoreHorizontal className="size-4 text-muted-warm" />
                </button>
              </div>
            ))}
            {filtered.length === 0 && <p className="py-12 text-center text-sm text-muted-warm">No products found</p>}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button onClick={openAdd} className="fixed bottom-24 right-4 z-30 flex size-14 cursor-pointer items-center justify-center rounded-full bg-brand-primary shadow-lg transition-transform active:scale-90 md:bottom-8 md:right-8">
        <Plus className="size-7 text-surface" />
      </button>

      {/* Modals */}
      <MobileFilterSheet
        open={mobileFilterOpen} onClose={() => setMobileFilterOpen(false)}
        categories={categories} stockFilters={stockFilters} sort={sort}
        priceMin={priceMin} priceMax={priceMax}
        onToggleCategory={toggleCategory} onToggleStock={toggleStock} onSetSort={setSort}
        onPriceMin={setPriceMin} onPriceMax={setPriceMax} onReset={resetFilters}
        onApply={() => setMobileFilterOpen(false)}
      />

      <ProductEditor open={editorOpen} onClose={() => setEditorOpen(false)} editProduct={editProduct} />
    </div>
  )
}
