import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export function SettingsBreadcrumb({ current }: { current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 px-5 pt-4 sm:px-0 sm:pt-0">
      <Link href="/account" className="font-body text-sm text-muted-warm hover:text-fg">
        Settings
      </Link>
      <ChevronRight className="h-3.5 w-3.5 text-muted-warm" />
      <span className="font-body text-sm font-semibold text-fg">{current}</span>
    </nav>
  )
}
