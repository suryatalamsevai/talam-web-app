import Link from 'next/link'
import { Logo } from '@/components/logo'

export function MarketingNav() {
  return (
    <nav className="fixed top-0 inset-x-0 z-50 flex items-center justify-between border-b border-white/10 bg-bg-dark/45 px-6 py-4 backdrop-blur-md md:px-[60px]">
      <Logo className="text-white text-[22px]" />
      <div className="hidden md:flex items-center gap-8">
        <a href="#features" className="text-sm text-white/70 hover:text-white transition-colors font-body">
          Features
        </a>
        <a href="#pricing" className="text-sm text-white/70 hover:text-white transition-colors font-body">
          Pricing
        </a>
        <a href="#faq" className="text-sm text-white/70 hover:text-white transition-colors font-body">
          FAQ
        </a>
        <Link
          href="/auth"
          className="text-sm text-white/70 hover:text-white transition-colors font-body"
        >
          Sign in
        </Link>
        <Link
          href="/auth"
          className="px-5 py-[9px] rounded-full bg-brand-primary text-white text-sm font-semibold font-body hover:opacity-90 transition-opacity"
        >
          Start free
        </Link>
      </div>
      <Link
        href="/auth"
        className="md:hidden px-4 py-2 rounded-full bg-brand-primary text-white text-xs font-semibold font-body"
      >
        Start free
      </Link>
    </nav>
  )
}
