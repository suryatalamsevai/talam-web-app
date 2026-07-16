'use client'

import { createContext, useContext } from 'react'
import Link from 'next/link'

const StoreBaseContext = createContext('')

export function StoreBaseProvider({ base, children }: { base: string; children: React.ReactNode }) {
  return <StoreBaseContext value={base}>{children}</StoreBaseContext>
}

export function useStoreBase() {
  return useContext(StoreBaseContext)
}

export function useStoreHref(path: string) {
  return `${useStoreBase()}${path}`
}

export function StoreLink({ href, children, ...props }: React.ComponentProps<typeof Link>) {
  const base = useStoreBase()
  const resolved = typeof href === 'string' ? `${base}${href}` : href
  return <Link href={resolved} {...props}>{children}</Link>
}

export function StoreIconButton({ children, href }: { children: React.ReactNode; href: string }) {
  const base = useStoreBase()
  return (
    <Link
      href={`${base}${href}`}
      className="flex size-9 shrink-0 items-center justify-center sm:size-10 sm:rounded-lg sm:bg-border-light"
    >
      {children}
    </Link>
  )
}
