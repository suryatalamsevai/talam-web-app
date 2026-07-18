'use client'

import { useState } from 'react'
import { SearchOverlay } from './search-overlay'

export function SearchButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex size-9 cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-bg"
        aria-label="Search products"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="11" cy="11" r="8" stroke="#8B7D7A" strokeWidth="1.8" />
          <path d="m21 21-4.35-4.35" stroke="#8B7D7A" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      <SearchOverlay open={open} onClose={() => setOpen(false)} />
    </>
  )
}
