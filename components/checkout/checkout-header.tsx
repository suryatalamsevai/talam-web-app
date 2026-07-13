import Link from 'next/link'
import { ArrowLeft, Lock } from 'lucide-react'

export function CheckoutHeader({ storeName, backHref, onBack }: { storeName: string; backHref?: string; onBack?: () => void }) {
  return (
    <header className="sticky top-0 z-40 flex h-[60px] items-center justify-between border-b border-border bg-surface px-4 sm:h-[72px] sm:px-12">
      <div className="flex items-center gap-2 sm:gap-3">
        {backHref ? (
          <Link href={backHref} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-bg">
            <ArrowLeft className="h-4 w-4 text-fg" />
          </Link>
        ) : onBack ? (
          <button onClick={onBack} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-bg">
            <ArrowLeft className="h-4 w-4 text-fg" />
          </button>
        ) : null}
        <span className="font-heading text-base font-bold text-fg sm:text-lg">{storeName}</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1">
        <Lock className="h-3 w-3 text-success" />
        <span className="font-body text-[11px] font-medium text-success">Secure Checkout</span>
      </div>
    </header>
  )
}
