import { Copy, MessageCircle, PackagePlus, Palette, Store } from 'lucide-react'

import { StepTitle } from './onboarding-fields'

export function GoLiveStep({ slug }: { readonly slug: string }) {
  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <StepTitle
        step={5}
        title="Your store is ready"
        description="Share your link with customers and preview the storefront before your first sale."
      />
      <div className="relative mb-4 h-20 overflow-hidden rounded-xl bg-brand-primary/5">
        <Palette className="absolute left-8 top-5 size-6 rotate-[-12deg] text-brand-primary" />
        <PackagePlus className="absolute left-1/2 top-8 size-7 -translate-x-1/2 text-amber" />
        <Store className="absolute right-8 top-4 size-8 rotate-12 text-success" />
      </div>
      <div className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border-[1.5px] border-border bg-surface px-[14px] py-3">
          <p className="min-w-0 flex-1 truncate font-mono text-sm font-bold text-brand-primary">{slug}.talam.app</p>
          <button type="button" className="flex min-h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-bold text-fg">
            <Copy className="size-3.5" />
            Copy
          </button>
        </div>
        <button type="button" className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#25D366] px-4 text-[15px] font-bold text-surface">
          <MessageCircle className="size-5" />
          Share on WhatsApp
        </button>
        <button type="button" className="min-h-12 w-full rounded-lg border-[1.5px] border-border bg-surface px-4 text-[15px] font-bold text-fg transition-colors hover:border-brand-primary hover:text-brand-primary">
          View your store
        </button>
      </div>
    </div>
  )
}
