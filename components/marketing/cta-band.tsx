import Link from 'next/link'

export function CtaBand() {
  return (
    <section className="relative bg-bg-dark py-28 md:py-40 overflow-hidden">
      <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-amber/10 blur-[120px] pointer-events-none" />
      <div className="relative max-w-[900px] mx-auto px-6 md:px-[60px] text-center">
        <h2 className="font-marketing font-semibold text-white text-[42px] md:text-[72px] leading-[1.05] tracking-[-0.02em]">
          <span className="block overflow-hidden pb-1">
            <span className="marketing-reveal block">Your platform.</span>
          </span>
          <span className="block overflow-hidden pb-1">
            <span className="marketing-reveal block text-amber italic [animation-delay:140ms]">Your business.</span>
          </span>
        </h2>
        <div className="marketing-reveal mt-10 [animation-delay:280ms]">
          <Link
            href="/auth"
            className="inline-block px-10 py-4 rounded-full bg-brand-primary text-white text-base font-semibold font-body hover:opacity-90 transition-opacity"
          >
            Start free
          </Link>
          <p className="mt-4 text-sm text-white/40 font-body">
            14-day free trial · No credit card · No GST needed
          </p>
        </div>
      </div>
    </section>
  )
}
