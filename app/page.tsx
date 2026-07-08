'use client'

export default function MarketingHome() {
  return (
    <main className="relative w-full min-h-screen overflow-auto bg-surface">
      {/* Parallax Background Layer */}
      <div
        className="fixed inset-0 bg-gradient-to-br from-bg to-surface"
        style={{ zIndex: 0, pointerEvents: 'none' }}
      />

      {/* Parallax Accent Shape (moves slower) */}
      <div
        className="fixed -top-[150px] -right-[200px] md:-right-[300px] w-[600px] h-[600px] md:w-[800px] md:h-[800px] rounded-full bg-brand-primary"
        style={{
          zIndex: 1,
          opacity: 0.08,
          willChange: 'transform',
          pointerEvents: 'none',
        }}
      />

      {/* Content Layer (moves at normal scroll speed) */}
      <div className="relative z-10 flex flex-col w-full min-h-screen" style={{ zIndex: 10 }}>
        {/* Navigation */}
        <nav className="flex items-center justify-between px-6 py-4 md:px-[60px] md:py-6 flex-shrink-0">
          <div className="text-lg md:text-xl font-bold text-fg font-heading">
            Talam
          </div>
          <div className="hidden md:flex items-center gap-10">
            <div className="text-sm text-fg font-body cursor-pointer hover:opacity-70 transition-opacity">
              Features
            </div>
            <div className="text-sm text-fg font-body cursor-pointer hover:opacity-70 transition-opacity">
              Pricing
            </div>
            <button className="flex items-center px-5 py-[9px] rounded-full bg-brand-primary hover:opacity-90 transition-opacity">
              <span className="text-sm font-semibold text-white font-body">
                Sign in
              </span>
            </button>
          </div>
          <button className="md:hidden flex items-center px-4 py-2 rounded-full bg-brand-primary hover:opacity-90 transition-opacity">
            <span className="text-xs font-semibold text-white font-body">
              Sign in
            </span>
          </button>
        </nav>

        {/* Hero Content */}
        <div className="flex flex-col items-center justify-center flex-1 px-6 md:px-[60px] gap-4 md:gap-6 py-12 md:py-0 min-h-0">
          <h1 className="text-[40px] md:text-[72px] font-bold leading-[46px] md:leading-[80px] tracking-tight md:tracking-[-1px] text-center text-fg font-heading flex-shrink-0">
            Your platform.
            <br />
            Your business.
          </h1>

          <p className="text-base md:text-lg leading-[23px] md:leading-[26px] max-w-[640px] text-center text-fg/70 font-body flex-shrink-0">
            Talam gives merchants a fully hosted storefront, built-in orders, and instant logistics—all under their own name.
          </p>

          <button className="flex items-center mt-1 md:mt-3 px-7 md:px-9 py-[13px] md:py-[15px] rounded-full bg-brand-primary hover:opacity-90 transition-opacity flex-shrink-0">
            <span className="text-sm md:text-base font-semibold text-white font-body">
              Start free
            </span>
          </button>
        </div>

        {/* Spacer to allow scrolling on mobile */}
        <div className="md:hidden h-20 flex-shrink-0" />
      </div>
    </main>
  )
}
