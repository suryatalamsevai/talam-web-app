import { ArrowLeft, ChevronRight } from 'lucide-react'
import { StoreLink } from '@/components/store/store-context'

export function SettingsBreadcrumb({ current }: { current: string }) {
  return (
    <div className="px-5 pt-4 sm:px-0 sm:pt-0">
      <StoreLink href="/" className="mb-2 flex w-fit items-center gap-1 font-body text-sm text-muted-warm hover:text-fg">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to shopping
      </StoreLink>
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5">
        <StoreLink href="/account" className="font-body text-sm text-muted-warm hover:text-fg">
          Settings
        </StoreLink>
        <ChevronRight className="h-3.5 w-3.5 text-muted-warm" />
        <span className="font-body text-sm font-semibold text-fg">{current}</span>
      </nav>
    </div>
  )
}
