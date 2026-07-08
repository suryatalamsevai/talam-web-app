'use client'

import { Search, Heart, ShoppingCart, ArrowLeft, ChevronRight } from 'lucide-react'

const heroProduct = {
  name: 'Kanjivaram Silk Saree',
  price: 2499,
  originalPrice: 3299,
  rating: 4.2,
  reviews: 248,
  category: 'HANDWOVEN SILK',
  badge: 'Only 3 Left',
  discount: '24% Off',
  sizes: ['XS', 'S', 'M', 'L', 'XL'],
}

const products = Array(9).fill(null).map((_, i) => ({
  id: String(i + 1),
  name: ['Black Print Kurti Set', 'Pashmangali Ikat Saree', 'Zari Border Dupatta', 'Teal Chandan Set', 'Banarasi Silk Dupatta', 'Zari Border Dupatta', 'Anarkali Suit Set', 'Printed Selwar Kameez', 'Silk Chiffon Dupatta'][i],
  price: [1299, 1899, 699, 2199, 899, 699, 2099, 1099, 899][i],
  originalPrice: [1899, 2499, 999, 2899, 1299, 999, 2799, 1599, 1299][i],
  rating: [4.3, 4.8, 4.5, 4.2, 4.6, 4.7, 4.4, 4.1, 4.9][i],
  reviews: [1234, 892, 456, 567, 823, 234, 567, 345, 678][i],
  discount: ['34% Off', '', '30% Off', '', '', '15% Off', '', '31% Off', ''][i],
  badge: ['', 'NEW', '', 'NEW', '2+ ago', '', 'NEW', '', 'NEW'][i],
}))

const occasions = [
  { name: 'Festive', emoji: '🎉', count: '45' },
  { name: 'Wedding', emoji: '💍', count: '32' },
  { name: 'Casual', emoji: '☀️', count: '56' },
  { name: 'Office', emoji: '💼', count: '34' },
  { name: 'Party', emoji: '🎊', count: '51' },
  { name: 'Travel', emoji: '✈️', count: '15' },
]

const categories = [
  { name: 'Sarees', count: '456', color: 'from-rose-600 to-rose-800' },
  { name: 'Kurta', count: '234', color: 'from-indigo-600 to-indigo-800' },
  { name: 'Dupattas', count: '123', color: 'from-orange-500 to-orange-700' },
  { name: 'Sets & Suits', count: '189', color: 'from-emerald-600 to-emerald-800' },
  { name: 'Lehengas', count: '276', color: 'from-purple-600 to-purple-800' },
  { name: 'Accessories', count: '342', color: 'from-amber-700 to-amber-900' },
]

export default function ShopPage() {
  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Desktop Header */}
      <header className="hidden md:flex items-center justify-between px-8 py-4 bg-surface border-b border-border sticky top-0 z-40">
        <div className="flex items-center gap-8">
          <div className="text-lg font-bold text-fg font-heading">talam.</div>
          <nav className="flex items-center gap-8 text-sm">
            {['Women', 'Men', 'Festive', 'New Arrivals', 'Sale', 'About'].map(link => (
              <a key={link} href="#" className="text-fg hover:text-store-primary transition-colors">{link}</a>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 px-4 py-2 bg-bg rounded-lg">
            <Search className="w-4 h-4 text-fg/50" />
            <input type="text" placeholder="Search products..." className="bg-transparent text-sm outline-none w-48 text-fg placeholder:text-fg/50" />
          </div>
          <Heart className="w-5 h-5 text-fg cursor-pointer hover:text-store-primary transition-colors" />
          <div className="relative">
            <ShoppingCart className="w-5 h-5 text-fg cursor-pointer hover:text-store-primary transition-colors" />
            <span className="absolute -top-2 -right-2 w-5 h-5 bg-store-primary text-white text-xs rounded-full flex items-center justify-center font-bold">2</span>
          </div>
        </div>
      </header>

      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between px-4 py-3 bg-surface border-b border-border sticky top-0 z-40">
        <ArrowLeft className="w-5 h-5 text-fg" />
        <div className="flex items-center gap-2 px-3 py-2 bg-bg rounded-lg flex-1 mx-3">
          <Search className="w-4 h-4 text-fg/50" />
          <input type="text" placeholder="Search..." className="bg-transparent text-xs outline-none w-full text-fg placeholder:text-fg/50" />
        </div>
        <ShoppingCart className="w-5 h-5 text-fg" />
      </header>

      <div className="flex flex-1">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 flex-shrink-0 border-r border-border bg-bg p-6 overflow-y-auto sticky top-20 h-[calc(100vh-80px)]">
          <h3 className="font-bold text-fg text-sm mb-4">Filters</h3>
          {['Category', 'Size', 'Price Range', 'Occasion'].map(section => (
            <div key={section} className="mb-6">
              <h4 className="font-semibold text-fg text-xs mb-3 uppercase tracking-wide">{section}</h4>
              <div className="space-y-2 text-sm text-fg/70">
                <p className="text-xs text-fg/50">Filter options</p>
              </div>
            </div>
          ))}
          <button className="w-full py-2 border border-store-primary text-store-primary font-semibold text-sm rounded-lg hover:bg-rose-50">Apply</button>
        </aside>

        {/* Main Content */}
        <main className="flex-1">
          {/* Hero */}
          <section className="bg-gradient-to-r from-rose-900 via-rose-700 to-rose-600 text-white relative h-96 px-6 md:px-8 py-8 flex items-center gap-8">
            <div className="w-full md:w-1/3 bg-rose-800 rounded-lg h-64 md:h-72 flex items-center justify-center text-6xl md:text-8xl flex-shrink-0">🥻</div>
            <div className="flex-1">
              <div className="flex gap-2 mb-3 flex-wrap">
                <span className="px-3 py-1 bg-red-500 text-white text-xs font-bold rounded-full">{heroProduct.discount}</span>
                <span className="px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-full">{heroProduct.badge}</span>
              </div>
              <p className="text-xs font-semibold opacity-80 mb-2 uppercase">{heroProduct.category}</p>
              <h1 className="text-2xl md:text-3xl font-bold font-heading mb-2">{heroProduct.name}</h1>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-semibold">⭐ {heroProduct.rating}</span>
                <span className="text-sm opacity-80">({heroProduct.reviews})</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl font-bold">₹{heroProduct.price}</span>
                <span className="text-lg opacity-70 line-through">₹{heroProduct.originalPrice}</span>
              </div>
              <div className="flex gap-2 mb-4 flex-wrap">
                {heroProduct.sizes.map(s => (
                  <button key={s} className="px-3 py-1 border-2 border-white/50 rounded hover:bg-white/20 text-sm font-semibold">{s}</button>
                ))}
              </div>
              <button className="bg-white text-rose-700 font-semibold px-6 py-2 rounded-lg hover:bg-gray-100">🛒 Add to Cart</button>
            </div>
          </section>

          {/* Flash Sale */}
          <div className="bg-slate-900 text-white px-6 md:px-8 py-3 flex items-center gap-4 overflow-x-auto">
            <span className="text-sm font-bold whitespace-nowrap">⚡ FLASH SALE</span>
            <div className="flex gap-2 text-xs font-bold">
              <div className="bg-slate-700 px-2 py-1 rounded">02</div>
              <span>:</span>
              <div className="bg-slate-700 px-2 py-1 rounded">45</div>
              <span>:</span>
              <div className="bg-slate-700 px-2 py-1 rounded">30</div>
            </div>
          </div>

          {/* Shop by Occasion */}
          <section className="px-6 md:px-8 py-8 border-t border-border">
            <h2 className="text-xl font-bold text-fg font-heading mb-6">Shop by Occasion</h2>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 md:mx-0 px-6 md:px-0">
              {occasions.map(occ => (
                <button key={occ.name} className="flex flex-col items-center gap-2 flex-shrink-0 hover:opacity-80">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-3xl">{occ.emoji}</div>
                  <span className="text-sm font-semibold text-fg">{occ.name}</span>
                  <span className="text-xs text-fg/50">{occ.count} items</span>
                </button>
              ))}
            </div>
          </section>

          {/* New This Week */}
          <section className="px-6 md:px-8 py-8 border-t border-border">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-fg font-heading">New This Week</h2>
                <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">🌟 5 items</span>
              </div>
              <a href="#" className="text-store-primary text-sm font-semibold hover:underline">View all →</a>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {products.slice(0, 5).map(p => (
                <div key={p.id} className="cursor-pointer hover:opacity-90">
                  <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg aspect-[3/4] flex items-center justify-center relative mb-2 text-4xl">👗
                    {p.badge && <span className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">{p.badge}</span>}
                    {p.discount && <span className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">{p.discount}</span>}
                    <button className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center text-lg hover:scale-110">❤️</button>
                  </div>
                  <h3 className="font-semibold text-sm text-fg line-clamp-2 mb-1">{p.name}</h3>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="font-bold text-sm text-fg">₹{p.price}</span>
                    <span className="text-xs text-fg/50 line-through">₹{p.originalPrice}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs">
                    <span className="font-semibold">⭐ {p.rating}</span>
                    <span className="text-fg/50">({p.reviews})</span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Browse Categories */}
          <section className="px-6 md:px-8 py-8 border-t border-border">
            <h2 className="text-xl font-bold text-fg font-heading mb-6">Browse Categories</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {categories.map(cat => (
                <button key={cat.name} className={`bg-gradient-to-br ${cat.color} text-white rounded-lg p-6 flex flex-col justify-between aspect-square hover:shadow-lg transition-shadow group`}>
                  <div className="text-left">
                    <h3 className="font-bold text-lg font-heading">{cat.name}</h3>
                    <p className="text-sm opacity-90">{cat.count} items</p>
                  </div>
                  <ChevronRight className="w-6 h-6 self-end group-hover:translate-x-1 transition-transform" />
                </button>
              ))}
            </div>
          </section>

          {/* All Products Grid */}
          <section className="px-6 md:px-8 py-8 border-t border-border">
            <h2 className="text-lg font-bold text-fg mb-6">All Products <span className="text-sm text-fg/50 font-normal">24 items</span></h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
              {products.map(p => (
                <div key={p.id} className="cursor-pointer hover:opacity-90 group">
                  <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg aspect-[3/4] flex items-center justify-center relative mb-2 group-hover:shadow-lg transition-shadow text-4xl">👗
                    {p.badge && <span className="absolute top-2 left-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">{p.badge}</span>}
                    {p.discount && <span className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded">{p.discount}</span>}
                    <button className="absolute top-2 right-2 w-7 h-7 bg-white rounded-full flex items-center justify-center text-lg opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110">❤️</button>
                  </div>
                  <h3 className="font-semibold text-sm text-fg line-clamp-2 mb-1">{p.name}</h3>
                  <div className="flex items-center gap-1 mb-1">
                    <span className="font-bold text-sm text-fg">₹{p.price}</span>
                    <span className="text-xs text-fg/50 line-through">₹{p.originalPrice}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs mb-2">
                    <span className="font-semibold">⭐ {p.rating}</span>
                    <span className="text-fg/50">({p.reviews})</span>
                  </div>
                  <button className="w-full py-2 bg-store-primary text-white font-semibold text-xs rounded-lg opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity hover:opacity-90">Add to Cart</button>
                </div>
              ))}
            </div>
            <div className="flex justify-center">
              <button className="px-8 py-3 bg-store-primary text-white font-semibold rounded-full hover:opacity-90 transition-opacity">Show more products ↓</button>
            </div>
          </section>

          <div className="h-24 md:h-0" />
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border flex z-50">
        {[['🏠', 'Home'], ['🛍️', 'Shop'], ['❤️', 'Wishlist'], ['📦', 'Orders'], ['👤', 'Account']].map(([icon, label], i) => (
          <button key={label} className={`flex-1 py-3 flex flex-col items-center gap-1 text-xs transition-colors ${i === 1 ? 'text-store-primary border-t-2 border-store-primary' : 'text-fg/50 hover:text-fg'}`}>
            <span className="text-xl">{icon}</span>
            <span className="text-[10px]">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
