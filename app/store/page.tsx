'use client'

import { Suspense, useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, ChevronDown, SlidersHorizontal, X } from 'lucide-react'
import Image from 'next/image'
import { mockGetProducts } from '@/lib/mock-data'
import { hapticError } from '@/lib/haptics'

// ponytail: UI-only display metadata per product (gradients, badges, occasions).
// The actual product data (name, slug, price, sizes, reviews) comes from mock-data.
const productUI: Record<string, { gradient: string; categoryLabel: string; badge: string | null; discount: string | null; occasion: string }> = {
  'kanjivaram-silk-saree': { gradient: 'linear-gradient(145deg, #c2185b, #880e4f)', categoryLabel: 'HANDWOVEN SILK', badge: 'Only 3 left!', discount: '24% OFF', occasion: 'Festive' },
  'block-print-kurti-set': { gradient: 'linear-gradient(145deg, oklab(55.6% 0.009 -0.132), oklab(32.1% .0008 -0.151))', categoryLabel: 'EMBROIDERED COTTON', badge: 'NEW', discount: null, occasion: 'Casual' },
  'zari-border-dupatta': { gradient: 'linear-gradient(145deg, #e65100, #bf360c)', categoryLabel: 'CHANDERI SILK', badge: null, discount: null, occasion: 'Festive' },
  'anarkali-suit-set': { gradient: 'linear-gradient(145deg, #1565c0, #0d47a1)', categoryLabel: 'GEORGETTE', badge: null, discount: '15% OFF', occasion: 'Wedding' },
  'pochampally-ikat-saree': { gradient: 'linear-gradient(145deg, #7b1fa2, #4a148c)', categoryLabel: 'IKAT WEAVE', badge: null, discount: null, occasion: 'Casual' },
  'printed-salwar-kameez': { gradient: 'linear-gradient(145deg, #2e7d32, #1b5e20)', categoryLabel: 'COTTON LAWN', badge: null, discount: null, occasion: 'Office' },
  'banarasi-silk-dupatta': { gradient: 'linear-gradient(145deg, #ad1457, #880e4f)', categoryLabel: 'BANARASI SILK', badge: null, discount: '30% OFF', occasion: 'Wedding' },
  'teal-chanderi-set': { gradient: 'linear-gradient(145deg, #00695c, #004d40)', categoryLabel: 'CHANDERI COTTON', badge: 'NEW', discount: '24% OFF', occasion: 'Festive' },
  'embroidered-kurti': { gradient: 'linear-gradient(145deg, #e65100, #bf360c)', categoryLabel: 'COTTON VOILE', badge: null, discount: null, occasion: 'Daily' },
  'silk-chiffon-dupatta': { gradient: 'linear-gradient(145deg, #283593, #1a237e)', categoryLabel: 'SILK CHIFFON', badge: null, discount: '25% OFF', occasion: 'Party' },
  'patola-silk-saree': { gradient: 'linear-gradient(145deg, #b71c1c, #880e4f)', categoryLabel: 'PATOLA SILK', badge: null, discount: '18% OFF', occasion: 'Wedding' },
  'palazzo-kurti-set': { gradient: 'linear-gradient(145deg, #4527a0, #311b92)', categoryLabel: 'RAYON BLEND', badge: 'NEW', discount: null, occasion: 'Casual' },
}

const defaultUI = { gradient: 'linear-gradient(145deg, #666, #444)', categoryLabel: '', badge: null, discount: null, occasion: 'Casual' }

const mockProducts = mockGetProducts()
const allProductsData = mockProducts.map(p => {
  const ui = productUI[p.slug] ?? defaultUI
  const discountPct = p.comparePrice && p.comparePrice > p.price
    ? Math.round((1 - p.price / p.comparePrice) * 100)
    : null
  return {
    ...p,
    originalPrice: p.comparePrice,
    rating: p.averageRating ?? 0,
    reviews: p.reviewCount,
    category: p.category?.name ?? '',
    gradient: ui.gradient,
    categoryLabel: ui.categoryLabel,
    badge: ui.badge,
    discount: discountPct ? `${discountPct}% OFF` : ui.discount,
    occasion: ui.occasion,
  }
})

const heroSlugs = ['kanjivaram-silk-saree', 'block-print-kurti-set', 'zari-border-dupatta']
const heroProducts = heroSlugs.map(slug => {
  const p = allProductsData.find(x => x.slug === slug)!
  return {
    name: p.name.replace(' ', '\n'), slug: p.slug, price: p.price,
    originalPrice: p.originalPrice ?? p.price,
    rating: p.rating, reviews: p.reviews,
    category: (productUI[slug] ?? defaultUI).categoryLabel,
    badge: p.badge, discount: p.discount,
    savings: (p.originalPrice ?? p.price) - p.price,
    sizes: p.sizes,
  }
})

const newThisWeek = allProductsData.filter(p => p.isNew).slice(0, 5).map(p => ({
  name: p.name, slug: p.slug, price: p.price, rating: p.rating,
  reviews: p.reviews, badge: 'NEW' as const, gradient: p.gradient, image: p.images[0],
}))

const occasions = [
  { name: 'Festive', count: 48, emoji: '🎉' },
  { name: 'Wedding', count: 32, emoji: '💍' },
  { name: 'Casual', count: 56, emoji: '☀️' },
  { name: 'Office', count: 24, emoji: '💼' },
  { name: 'Daily', count: 61, emoji: '🌿' },
  { name: 'Party', count: 19, emoji: '🎊' },
  { name: 'Travel', count: 15, emoji: '✈️' },
]

const categoryCards = [
  { name: 'Sarees', count: '48 styles', gradient: 'linear-gradient(135deg, oklab(53.1% 0.201 0.020), oklab(41.5% 0.160 -0.012))' },
  { name: 'Kurtis', count: '36 styles', gradient: 'linear-gradient(135deg, #1565c0, #0d47a1)' },
  { name: 'Dupattas', count: '22 styles', gradient: 'linear-gradient(135deg, #e65100, #bf360c)' },
  { name: 'Sets & Suits', count: '29 styles', gradient: 'linear-gradient(135deg, #2e7d32, #1b5e20)' },
  { name: 'Lehengas', count: '18 styles', gradient: 'linear-gradient(135deg, #1565c0, #283593)' },
  { name: 'Accessories', count: '15 styles', gradient: 'linear-gradient(135deg, #4a148c, #311b92)' },
]

const CATEGORY_OPTIONS = ['Sarees', 'Kurtis', 'Dupattas', 'Sets & Suits'] as const
const SIZE_OPTIONS = ['M', 'XS', 'S', 'L', 'XL', 'XXL'] as const
const OCCASION_OPTIONS = ['Festive', 'Wedding', 'Casual'] as const
const SORT_OPTIONS = ['Newest First', 'Price: Low to High', 'Price: High to Low', 'Rating'] as const

const deals = [
  { offer: 'Upto 50% off', sub: 'Sarees' },
  { offer: 'Buy 2 Get 1', sub: 'Dupattas' },
  { offer: 'Flat ₹200 off', sub: '₹1000+' },
  { offer: 'Free Shipping', sub: '₹599+' },
]

const PRODUCTS_PER_PAGE = 6

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
      <polyline points="2,6 5,9 10,3" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function HeartIcon({ size = 12, color = '#8B7D7A' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill="none" stroke={color} strokeWidth="1.8" />
    </svg>
  )
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="21" r="1" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <circle cx="20" cy="21" r="1" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" fill="none" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ImagePlaceholder() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="rgb(255 255 255 / 20%)" />
      <circle cx="8.5" cy="8.5" r="1.5" fill="none" stroke="rgb(255 255 255 / 20%)" />
      <path d="M21 15l-5-5L5 21" fill="none" stroke="rgb(255 255 255 / 20%)" />
    </svg>
  )
}

function Stars({ rating }: { rating: number }) {
  const full = Math.floor(rating)
  const empty = 5 - full
  return <span className="text-success">{'★'.repeat(full)}{'☆'.repeat(empty)}</span>
}

function useCountdown(initialSeconds: number) {
  const [seconds, setSeconds] = useState(initialSeconds)
  useEffect(() => {
    const id = setInterval(() => setSeconds(s => (s <= 0 ? initialSeconds : s - 1)), 1000)
    return () => clearInterval(id)
  }, [initialSeconds])
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return [String(h).padStart(2, '0'), String(m).padStart(2, '0'), String(s).padStart(2, '0')] as const
}

function toggle<T>(set: Set<T>, val: T): Set<T> {
  const next = new Set(set)
  next.has(val) ? next.delete(val) : next.add(val)
  return next
}

export default function StorePage() {
  return (
    <Suspense fallback={null}>
      <StorePageInner />
    </Suspense>
  )
}

function StorePageInner() {
  // ── Header nav filter params (Women/Men/Festive/New Arrivals — see StoreHeader) ──
  const searchParams = useSearchParams()

  // ── Carousel ──
  const [heroIndex, setHeroIndex] = useState(0)
  const [activeSize, setActiveSize] = useState('XS')
  const autoplayRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hero = heroProducts[heroIndex]

  const startAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current)
    if (document.visibilityState !== 'visible') return
    autoplayRef.current = setInterval(() => setHeroIndex(i => (i + 1) % heroProducts.length), 5000)
  }, [])

  const stopAutoplay = useCallback(() => {
    if (autoplayRef.current) { clearInterval(autoplayRef.current); autoplayRef.current = null }
  }, [])

  useEffect(() => {
    startAutoplay()
    return stopAutoplay
  }, [startAutoplay, stopAutoplay])

  const goTo = (i: number) => { setHeroIndex(i); stopAutoplay() }
  const prevHero = () => goTo((heroIndex - 1 + heroProducts.length) % heroProducts.length)
  const nextHero = () => goTo((heroIndex + 1) % heroProducts.length)

  // ── Hero swipe ──
  const heroTouchStart = useRef<number | null>(null)
  const handleHeroTouchStart = (e: React.TouchEvent) => { heroTouchStart.current = e.touches[0].clientX }
  const handleHeroTouchEnd = (e: React.TouchEvent) => {
    if (heroTouchStart.current === null) return
    const diff = heroTouchStart.current - e.changedTouches[0].clientX
    if (Math.abs(diff) > 40) diff > 0 ? nextHero() : prevHero()
    heroTouchStart.current = null
  }

  // ── Timer ──
  const [hours, minutes, secs] = useCountdown(2 * 3600 + 45 * 60 + 30)

  // ── Filters ──
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set())
  const [selectedSizes, setSelectedSizes] = useState<Set<string>>(new Set())
  const [selectedOccasions, setSelectedOccasions] = useState<Set<string>>(new Set())
  const [priceMin, setPriceMin] = useState('500')
  const [priceMax, setPriceMax] = useState('5000')
  const [sortBy, setSortBy] = useState<string>('Newest First')
  const [showSortMenu, setShowSortMenu] = useState(false)
  const [showMobileFilters, setShowMobileFilters] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PRODUCTS_PER_PAGE)

  useEffect(() => {
    const occasion = searchParams.get('occasion')
    if (occasion) setSelectedOccasions(new Set([occasion]))
    if (searchParams.get('sort') === 'newest') setSortBy('Newest First')
  }, [searchParams])

  const activeFilterCount = (selectedCategories.size > 0 ? 1 : 0) + (selectedSizes.size > 0 ? 1 : 0) + (selectedOccasions.size > 0 ? 1 : 0)

  const priceRangeInvalid = Number(priceMin) > Number(priceMax) && Number(priceMax) > 0
  const priceErrorShown = useRef(false)
  useEffect(() => {
    if (priceRangeInvalid && !priceErrorShown.current) {
      hapticError()
      priceErrorShown.current = true
    } else if (!priceRangeInvalid) {
      priceErrorShown.current = false
    }
  }, [priceRangeInvalid])

  const filteredProducts = allProductsData.filter(p => {
    if (selectedCategories.size > 0 && !selectedCategories.has(p.category)) return false
    if (selectedSizes.size > 0 && !p.sizes.some(s => selectedSizes.has(s))) return false
    if (selectedOccasions.size > 0 && !selectedOccasions.has(p.occasion)) return false
    const min = Number(priceMin) || 0
    const max = Number(priceMax) || Infinity
    if (p.price < min || p.price > max) return false
    return true
  }).sort((a, b) => {
    if (sortBy === 'Price: Low to High') return a.price - b.price
    if (sortBy === 'Price: High to Low') return b.price - a.price
    if (sortBy === 'Rating') return b.rating - a.rating
    return 0
  })

  const visibleProducts = filteredProducts.slice(0, visibleCount)
  const hasMore = visibleCount < filteredProducts.length

  const handleReset = () => {
    setSelectedCategories(new Set())
    setSelectedSizes(new Set())
    setSelectedOccasions(new Set())
    setPriceMin('500')
    setPriceMax('5000')
    setVisibleCount(PRODUCTS_PER_PAGE)
  }

  const removeFilterChip = (type: 'category' | 'size' | 'occasion', val: string) => {
    if (type === 'category') setSelectedCategories(s => { const n = new Set(s); n.delete(val); return n })
    if (type === 'size') setSelectedSizes(s => { const n = new Set(s); n.delete(val); return n })
    if (type === 'occasion') setSelectedOccasions(s => { const n = new Set(s); n.delete(val); return n })
  }

  const activeChips: { type: 'category' | 'size' | 'occasion'; label: string; value: string }[] = [
    ...[...selectedCategories].map(v => ({ type: 'category' as const, label: v, value: v })),
    ...[...selectedSizes].map(v => ({ type: 'size' as const, label: `Size ${v}`, value: v })),
    ...[...selectedOccasions].map(v => ({ type: 'occasion' as const, label: v, value: v })),
  ]

  // ── Filter sidebar (shared between desktop and mobile sheet) ──
  const filterPanel = (
    <>
      <p className="text-fg text-base font-bold font-body leading-5 mb-5">Filters</p>

      {/* Category */}
      <div className="border-b border-[#F0E8D8] mb-5 pb-5">
        <p className="text-[#8B7D7A] text-[11px] font-bold font-body uppercase tracking-[0.08em] leading-[14px] mb-3">Category</p>
        <div className="flex flex-col gap-2">
          {CATEGORY_OPTIONS.map(c => {
            const checked = selectedCategories.has(c)
            return (
              <label key={c} className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedCategories(s => toggle(s, c))}>
                <span className={`w-4 h-4 rounded shrink-0 border-[1.5px] flex items-center justify-center transition-colors ${checked ? 'bg-store-primary border-store-primary' : 'bg-white border-border'}`}>
                  {checked && <CheckIcon />}
                </span>
                <span className="text-fg text-[13px] font-body leading-4">{c}</span>
                <span className="text-[#B0A090] text-[11px] font-body ml-auto">({allProductsData.filter(p => p.category === c).length})</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Size */}
      <div className="border-b border-[#F0E8D8] mb-5 pb-5">
        <p className="text-[#8B7D7A] text-[11px] font-bold font-body uppercase tracking-[0.08em] leading-[14px] mb-3">Size</p>
        <div className="flex flex-wrap gap-1.5">
          {SIZE_OPTIONS.map(s => {
            const active = selectedSizes.has(s)
            return (
              <button key={s} onClick={() => setSelectedSizes(set => toggle(set, s))} className={`px-3 py-1.5 rounded-md border-[1.5px] text-[12px] font-body leading-4 transition-colors ${active ? 'bg-store-primary/6 border-store-primary text-store-primary font-semibold' : 'border-border text-[#8B7D7A] hover:border-[#8B7D7A]'}`}>
                {s}
              </button>
            )
          })}
        </div>
      </div>

      {/* Price Range */}
      <div className="border-b border-[#F0E8D8] mb-5 pb-5">
        <p className="text-[#8B7D7A] text-[11px] font-bold font-body uppercase tracking-[0.08em] leading-[14px] mb-3">Price Range</p>
        <div className="flex items-center gap-2">
          <div className="flex-1 border-[1.5px] border-border rounded-md px-2.5 py-[7px] focus-within:border-store-primary transition-colors">
            <input type="number" value={priceMin} onChange={e => setPriceMin(e.target.value)} className="text-fg text-[12px] font-body bg-transparent outline-none w-full" placeholder="Min" />
          </div>
          <span className="text-[#B0A090] text-[12px] font-body">–</span>
          <div className="flex-1 border-[1.5px] border-border rounded-md px-2.5 py-[7px] focus-within:border-store-primary transition-colors">
            <input type="number" value={priceMax} onChange={e => setPriceMax(e.target.value)} className="text-fg text-[12px] font-body bg-transparent outline-none w-full" placeholder="Max" />
          </div>
        </div>
        {priceRangeInvalid && (
          <p className="text-danger text-[10px] font-body mt-1">Min price cannot exceed max price</p>
        )}
      </div>

      {/* Occasion */}
      <div className="mb-5">
        <p className="text-[#8B7D7A] text-[11px] font-bold font-body uppercase tracking-[0.08em] leading-[14px] mb-3">Occasion</p>
        <div className="flex flex-col gap-2">
          {OCCASION_OPTIONS.map(o => {
            const checked = selectedOccasions.has(o)
            return (
              <label key={o} className="flex items-center gap-2 cursor-pointer" onClick={() => setSelectedOccasions(s => toggle(s, o))}>
                <span className={`w-4 h-4 rounded shrink-0 border-[1.5px] flex items-center justify-center transition-colors ${checked ? 'bg-store-primary border-store-primary' : 'bg-white border-border'}`}>
                  {checked && <CheckIcon />}
                </span>
                <span className="text-fg text-[13px] font-body leading-4">{o}</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button onClick={() => { setVisibleCount(PRODUCTS_PER_PAGE); setShowMobileFilters(false) }} className="flex-1 py-2.5 rounded-lg border-[1.5px] border-store-primary text-store-primary text-[13px] font-semibold font-body text-center hover:bg-store-primary/5 transition-colors">
          Apply ({filteredProducts.length})
        </button>
        <button onClick={handleReset} className="px-3.5 py-2.5 rounded-lg border-[1.5px] border-border text-[#8B7D7A] text-[13px] font-body hover:bg-[#F9F9F9] transition-colors">Reset</button>
      </div>
    </>
  )

  return (
    <div className="flex flex-col min-h-screen bg-[#F9F9F9] font-body overflow-x-hidden">
      {/* ─── Hero Carousel (fixed height, no layout shift) ─── */}
      <section
        className="relative overflow-hidden h-[360px] md:h-[400px] touch-pan-y"
        style={{ backgroundImage: 'linear-gradient(120deg, oklab(22.1% 0.025 -0.083), oklab(26.4% 0.107 0.004) 45%, oklab(53.1% 0.201 0.020))' }}
        onTouchStart={handleHeroTouchStart}
        onTouchEnd={handleHeroTouchEnd}
      >
        <div className="absolute rounded-full" style={{ top: '-80px', left: '50%', width: '400px', height: '400px', backgroundColor: 'rgba(255,255,255,0.04)' }} />
        <div className="absolute rounded-full" style={{ bottom: '-60px', right: '200px', width: '240px', height: '240px', backgroundColor: 'rgba(255,255,255,0.03)' }} />

        <div className="flex h-full">
          {/* Product image area */}
          <div className="w-[520px] shrink-0 hidden lg:flex items-center justify-center relative">
            <div className="w-[340px] h-[380px] rounded-2xl border border-white/10 flex items-center justify-center transition-opacity duration-500" style={{ backgroundImage: 'linear-gradient(160deg, rgba(255,255,255,0.08), rgba(255,255,255,0.02))' }}>
              <ImagePlaceholder />
            </div>
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2">
              {heroProducts.map((_, i) => (
                <button key={i} onClick={() => goTo(i)} className={`w-[52px] h-[52px] rounded-lg shrink-0 transition-all ${i === heroIndex ? 'border-2 border-white bg-white/15' : 'border border-white/30 bg-white/8'}`} />
              ))}
              <div className="w-[52px] h-[52px] rounded-lg border border-white/30 bg-white/8 shrink-0" />
            </div>
          </div>

          {/* Product info — key forces remount for clean transition */}
          <div key={heroIndex} className="flex-1 flex flex-col justify-center px-5 md:pr-16 md:pl-5 py-6 md:py-12 relative animate-[fadeIn_0.4s_ease-out]">
            <div className="flex gap-2.5 mb-4 flex-wrap">
              {hero.discount && <span className="px-3.5 py-1 bg-store-primary rounded-md text-white text-[13px] font-extrabold leading-4 font-body">{hero.discount}</span>}
              {hero.badge && (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-danger/85 rounded-full">
                  <span className="w-[5px] h-[5px] rounded-full bg-white shrink-0" />
                  <span className="text-white text-[11px] font-semibold leading-[14px] font-body">{hero.badge}</span>
                </span>
              )}
            </div>
            <p className="text-white/50 text-[11px] font-body uppercase tracking-[0.12em] leading-[14px] mb-2">{hero.category}</p>
            <h1 className="text-white text-[22px] md:text-[36px] font-bold font-heading leading-[115%] mb-3 md:mb-4 whitespace-pre-line">{hero.name}</h1>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="text-success text-[13px] font-body">★★★★★</span>
              <span className="text-white/60 text-[13px] font-body">{hero.rating.toFixed(1)} · {hero.reviews} reviews</span>
            </div>
            <div className="flex items-baseline gap-2 md:gap-3 mb-4 md:mb-6 flex-wrap">
              <span className="text-white text-[22px] md:text-[32px] font-extrabold font-body leading-8 md:leading-10">₹{hero.price.toLocaleString('en-IN')}</span>
              <span className="text-white/40 text-[14px] md:text-[18px] font-body line-through">₹{hero.originalPrice.toLocaleString('en-IN')}</span>
              <span className="px-2 py-0.5 md:px-2.5 md:py-1 bg-white/10 border border-white/20 rounded text-white/70 text-[10px] md:text-[12px] font-body leading-4">Save ₹{hero.savings}</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 mb-4 md:mb-6 flex-wrap">
              <span className="text-white/50 text-[12px] font-body mr-1">Size:</span>
              {hero.sizes.map(s => (
                <button key={s} onClick={() => setActiveSize(s)} className={`px-2.5 md:px-4 py-1 md:py-1.5 rounded-lg text-[12px] md:text-[13px] font-body transition-all ${s === activeSize ? 'border-2 border-white text-white font-bold' : 'border border-white/30 text-white/60'}`}>
                  {s}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Link href={`/product/${hero.slug}`} className="inline-flex items-center gap-2 bg-store-primary rounded-[10px] px-5 md:px-8 py-3 md:py-3.5 hover:opacity-90 transition-opacity">
                <CartIcon />
                <span className="text-white text-[15px] font-bold font-body leading-[18px]">View Product</span>
              </Link>
              <button className="w-12 h-12 shrink-0 rounded-[10px] border-[1.5px] border-white/40 flex items-center justify-center hover:bg-white/10 transition-colors">
                <HeartIcon size={20} color="#FFFFFF" />
              </button>
            </div>
          </div>

          {/* Carousel controls (desktop) */}
          <div className="hidden lg:flex items-center gap-2 absolute bottom-5 right-12">
            {heroProducts.map((_, i) => (
              <span key={i} className={`rounded-full transition-all cursor-pointer ${i === heroIndex ? 'w-7 h-[5px] bg-white' : 'w-[5px] h-[5px] bg-white/35'}`} onClick={() => goTo(i)} />
            ))}
            <div className="flex gap-1.5 ml-3">
              <button onClick={prevHero} className="w-8 h-8 rounded-full bg-white/15 border border-white/25 flex items-center justify-center hover:bg-white/25 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </button>
              <button onClick={nextHero} className="w-8 h-8 rounded-full bg-white/15 border border-white/25 flex items-center justify-center hover:bg-white/25 transition-colors">
                <ChevronRight className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Mobile carousel dots */}
          <div className="lg:hidden absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {heroProducts.map((_, i) => (
              <span key={i} className={`rounded-full transition-all ${i === heroIndex ? 'w-5 h-1 bg-white' : 'w-1 h-1 bg-white/35'}`} onClick={() => goTo(i)} />
            ))}
          </div>
        </div>
      </section>

      {/* ─── Flash Sale Bar ─── */}
      <div className="overflow-hidden" style={{ backgroundColor: '#0E0A1F' }}>
        {/* Main row: timer + deals */}
        <div className="flex items-center justify-center lg:justify-start gap-3 lg:gap-8 h-10 lg:h-14 px-3 lg:px-12">
          <div className="flex items-center gap-1.5 lg:gap-2.5 shrink-0">
            <span className="text-sm lg:text-base">⚡</span>
            <span className="text-white text-[11px] lg:text-[13px] font-bold font-body uppercase tracking-[0.08em]">Flash Sale</span>
            <div className="flex items-center gap-[2px] lg:gap-[3px]">
              {[hours, minutes, secs].map((t, i) => (
                <div key={i} className="flex items-center gap-[2px] lg:gap-[3px]">
                  {i > 0 && <span className="text-white/40 text-[10px] lg:text-[11px] font-body">:</span>}
                  <span className="bg-white/12 rounded px-1.5 lg:px-2 py-0.5 lg:py-1 text-white text-[11px] lg:text-[13px] font-bold font-body leading-4 tabular-nums w-[28px] lg:w-[33px] text-center">{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="hidden lg:flex gap-2.5 flex-1 overflow-x-auto">
            {deals.map((d, i) => (
              <span key={i} className="inline-flex items-center gap-2 shrink-0 px-4 py-1.5 rounded-lg border border-[#D4AF374D] bg-white/8">
                <span className="text-[#D4AF37] text-[12px] font-bold font-body leading-4">{d.offer}</span>
                <span className="text-white/35 text-[11px] font-body">{d.sub}</span>
              </span>
            ))}
          </div>
          <span className="text-[#D4AF37] text-[12px] font-semibold font-body shrink-0 hidden lg:block cursor-pointer">View all deals →</span>
        </div>
        {/* Mobile/tablet marquee deals */}
        <div className="lg:hidden h-6 overflow-hidden">
          <div className="flex gap-6 animate-[marquee_15s_linear_infinite] whitespace-nowrap items-center h-full px-3">
            {[...deals, ...deals].map((d, i) => (
              <span key={i} className="text-[#D4AF37] text-[10px] font-bold font-body">{d.offer} <span className="text-white/35 font-normal">on {d.sub}</span></span>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Main content area ─── */}
      <div className="max-w-[1312px] mx-auto w-full px-4 md:px-16">
        {/* Shop by Occasion */}
        <section className="py-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-store-primary rounded-full" />
              <h2 className="text-[18px] font-bold text-fg font-body leading-[22px]">Shop by Occasion</h2>
            </div>
            <span className="text-store-primary text-[13px] font-semibold font-body cursor-pointer">See all occasions →</span>
          </div>
          <div className="flex gap-5 sm:gap-8 overflow-x-auto pb-2 no-scrollbar">
            {occasions.map(occ => (
              <button key={occ.name} className="flex flex-col items-center gap-2.5 shrink-0 group">
                <div className="w-24 h-24 rounded-full flex items-center justify-center text-3xl border-[3px] border-store-primary shrink-0" style={{ backgroundImage: 'linear-gradient(135deg, oklab(53.1% 0.201 0.020), oklab(41.5% 0.160 -0.012))', boxShadow: '#E8577E4D 0px 4px 16px' }}>
                  {occ.emoji}
                </div>
                <span className="text-fg text-[13px] font-semibold font-body">{occ.name}</span>
                <span className="text-[#8B7D7A] text-[11px] font-body -mt-1">{occ.count} items</span>
              </button>
            ))}
          </div>
        </section>

        {/* New This Week */}
        <section className="pb-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-store-primary rounded-full" />
              <h2 className="text-[18px] font-bold text-fg font-body leading-[22px]">New This Week</h2>
              <span className="ml-2 px-2.5 py-0.5 bg-success text-white text-[10px] font-bold rounded font-body leading-3">8 items</span>
            </div>
            <span className="text-store-primary text-[13px] font-semibold font-body cursor-pointer">View all new arrivals →</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {newThisWeek.map((p, i) => (
              <Link key={i} href={`/product/${p.slug}`} className="bg-white rounded-xl border-[1.5px] border-[#F0E8D8] overflow-hidden block hover:border-store-primary hover:shadow-md transition">
                <div className="aspect-[2/3] relative bg-bg" style={!p.image ? { backgroundImage: p.gradient } : undefined}>
                  {p.image && <Image src={p.image} alt={p.name} fill sizes="(min-width:768px) 20vw, 50vw" className="object-cover" />}
                  <span className="absolute top-2 left-2 px-2 py-[3px] bg-success rounded text-white text-[10px] font-bold font-body leading-3">{p.badge}</span>
                  <span className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center">
                    <HeartIcon />
                  </span>
                </div>
                <div className="p-2.5">
                  <h3 className="text-fg text-[13px] font-bold font-heading leading-[130%] mb-1">{p.name}</h3>
                  <p className="text-fg text-[14px] font-extrabold font-body leading-[18px]">₹{p.price.toLocaleString('en-IN')}</p>
                  <p className="text-[10px] font-body leading-3 mt-0.5"><Stars rating={p.rating} /> <span className="text-[#B0A090]">{p.rating.toFixed(1)} ({p.reviews})</span></p>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Browse Categories */}
        <section className="pb-10">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-1 h-5 bg-store-primary rounded-full" />
            <h2 className="text-[18px] font-bold text-fg font-body leading-[22px]">Browse Categories</h2>
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            {categoryCards.map(cat => (
              <div key={cat.name} className="h-[120px] rounded-xl overflow-hidden relative flex items-end p-3 cursor-pointer group" style={{ backgroundImage: cat.gradient }}>
                <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(0deg, rgba(0,0,0,0.55), rgba(0,0,0,0) 55%)' }} />
                <div className="relative">
                  <p className="text-white text-[13px] font-bold font-body leading-4">{cat.name}</p>
                  <p className="text-white/65 text-[10px] font-body leading-3 mt-px">{cat.count}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Divider */}
      <div className="h-2 bg-[#F0E8D8]" />

      {/* ─── Filters + Product Grid ─── */}
      <div className="max-w-[1312px] mx-auto w-full px-4 md:px-16 py-8">
        <div className="flex gap-8">
          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-[240px] shrink-0">
            {filterPanel}
          </aside>

          {/* Product grid area */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <h2 className="text-fg text-[16px] font-bold font-body leading-5">All Products</h2>
                <span className="text-[#8B7D7A] text-[13px] font-body">{filteredProducts.length} items</span>
              </div>
              <div className="hidden lg:flex items-center gap-2">
                {activeChips.map(c => (
                  <button key={c.label} onClick={() => removeFilterChip(c.type, c.value)} className="flex items-center gap-1 px-3 py-1 bg-store-primary/10 rounded-full text-store-primary text-[12px] font-body hover:bg-store-primary/20 transition-colors">
                    {c.label} <X className="w-3 h-3" />
                  </button>
                ))}
                <div className="relative ml-2">
                  <button onClick={() => setShowSortMenu(v => !v)} className="flex items-center gap-1 text-[13px] text-fg font-body">
                    Sort: <strong>{sortBy}</strong> <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {showSortMenu && (
                    <div className="absolute top-8 right-0 bg-white rounded-lg border border-border shadow-lg py-1 z-20 w-48">
                      {SORT_OPTIONS.map(opt => (
                        <button key={opt} onClick={() => { setSortBy(opt); setShowSortMenu(false) }} className={`w-full text-left px-4 py-2 text-[13px] font-body transition-colors ${opt === sortBy ? 'text-store-primary bg-store-primary/5 font-semibold' : 'text-fg hover:bg-[#F9F9F9]'}`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* Mobile filter button */}
              <button onClick={() => setShowMobileFilters(true)} className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[13px] text-fg font-body">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filter & Sort
                {activeFilterCount > 0 && <span className="w-4 h-4 bg-store-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center">{activeFilterCount}</span>}
              </button>
            </div>

            {/* Active filter chips (mobile) */}
            {activeChips.length > 0 && (
              <div className="lg:hidden flex gap-2 mb-4 flex-wrap">
                {activeChips.map(c => (
                  <button key={c.label} onClick={() => removeFilterChip(c.type, c.value)} className="flex items-center gap-1 px-2.5 py-1 bg-store-primary/10 rounded-full text-store-primary text-[11px] font-body">
                    {c.label} <X className="w-2.5 h-2.5" />
                  </button>
                ))}
              </div>
            )}

            {/* Grid */}
            {visibleProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-fg text-[16px] font-semibold font-body mb-2">No products found</p>
                <p className="text-[#8B7D7A] text-[13px] font-body mb-4">Try adjusting your filters</p>
                <button onClick={handleReset} className="px-6 py-2 rounded-lg border-[1.5px] border-store-primary text-store-primary text-[13px] font-semibold font-body">Clear all filters</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {visibleProducts.map((p, i) => (
                  <Link key={`${p.name}-${i}`} href={`/product/${p.slug}`} className="bg-white rounded-xl border-[1.5px] border-[#F0E8D8] overflow-hidden group cursor-pointer block hover:border-store-primary hover:shadow-md transition">
                    <div className="aspect-[2/3] relative bg-bg" style={!p.images[0] ? { backgroundImage: p.gradient } : undefined}>
                      {p.images[0] && <Image src={p.images[0]} alt={p.name} fill sizes="(min-width:768px) 30vw, 50vw" className="object-cover" />}
                      {p.discount && <span className="absolute top-2 left-2 px-2 py-[3px] bg-store-primary rounded text-white text-[10px] font-bold font-body leading-3">{p.discount}</span>}
                      {p.badge && !p.discount && <span className={`absolute top-2 left-2 px-2 py-[3px] rounded text-white text-[10px] font-bold font-body leading-3 ${p.badge === 'NEW' ? 'bg-success' : 'bg-danger/85'}`}>{p.badge}</span>}
                      <span className="absolute top-2 right-2 w-7 h-7 bg-white/90 rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                        <HeartIcon />
                      </span>
                    </div>
                    <div className="p-2.5">
                      <p className="text-[#8B7D7A] text-[10px] font-bold font-body uppercase tracking-[0.08em] leading-3 mb-1">{p.categoryLabel}</p>
                      <h3 className="text-fg text-[13px] font-bold font-heading leading-[130%] mb-1">{p.name}</h3>
                      <div className="flex items-center gap-2">
                        <span className="text-store-primary text-[14px] font-extrabold font-body leading-[18px]">₹{p.price.toLocaleString('en-IN')}</span>
                        {p.originalPrice && <span className="text-[#B0A090] text-[11px] font-body line-through">₹{p.originalPrice.toLocaleString('en-IN')}</span>}
                        <span className="ml-auto w-7 h-7 bg-store-primary rounded-md flex items-center justify-center text-white text-lg leading-none">+</span>
                      </div>
                      <p className="text-[10px] font-body leading-3 mt-1"><Stars rating={p.rating} /> <span className="text-[#B0A090]">{p.rating.toFixed(1)} ({p.reviews})</span></p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {/* Show more */}
            {filteredProducts.length > 0 && (
              <div className="flex flex-col items-center gap-3 mt-8">
                {hasMore ? (
                  <button onClick={() => setVisibleCount(c => c + PRODUCTS_PER_PAGE)} className="inline-flex items-center gap-2 px-10 py-3 bg-store-primary text-white text-[14px] font-semibold font-body rounded-full hover:opacity-90 transition-opacity">
                    Show more products
                    <ChevronDown className="w-4 h-4" />
                  </button>
                ) : visibleCount > PRODUCTS_PER_PAGE && (
                  <button onClick={() => { setVisibleCount(PRODUCTS_PER_PAGE); window.scrollTo({ top: document.querySelector('#product-grid-top')?.getBoundingClientRect().top! + window.scrollY - 80, behavior: 'smooth' }) }} className="inline-flex items-center gap-2 px-10 py-3 border-[1.5px] border-store-primary text-store-primary text-[14px] font-semibold font-body rounded-full hover:bg-store-primary/5 transition-colors">
                    Show less
                  </button>
                )}
                <span className="text-[#8B7D7A] text-[11px] font-body">Showing {Math.min(visibleCount, filteredProducts.length)} of {filteredProducts.length} products</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Mobile Filter Bottom Sheet ─── */}
      {showMobileFilters && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto p-6 animate-[slideUp_0.3s_ease-out]">
            <div className="flex items-center justify-between mb-4">
              <span className="text-fg text-[16px] font-bold font-body">Filters</span>
              <button onClick={() => setShowMobileFilters(false)} className="w-8 h-8 rounded-full bg-[#F9F9F9] flex items-center justify-center">
                <X className="w-4 h-4 text-fg" />
              </button>
            </div>
            {/* Sort (mobile only) */}
            <div className="border-b border-[#F0E8D8] mb-5 pb-5">
              <p className="text-[#8B7D7A] text-[11px] font-bold font-body uppercase tracking-[0.08em] leading-[14px] mb-3">Sort By</p>
              <div className="flex flex-wrap gap-1.5">
                {SORT_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => setSortBy(opt)} className={`px-3 py-1.5 rounded-md border-[1.5px] text-[12px] font-body leading-4 transition-colors ${opt === sortBy ? 'bg-store-primary/6 border-store-primary text-store-primary font-semibold' : 'border-border text-[#8B7D7A]'}`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>
            {filterPanel}
          </div>
        </div>
      )}
    </div>
  )
}
