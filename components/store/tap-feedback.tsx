'use client'

import { useEffect } from 'react'
import { haptic } from '@/lib/haptics'

// ponytail: single delegated listener instead of per-button handlers — buzzes on any real tap target
export function TapFeedback() {
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (e.pointerType !== 'touch') return
      const target = (e.target as HTMLElement).closest('button, a, [role="button"], input[type="checkbox"], input[type="radio"]')
      if (target && !target.hasAttribute('disabled')) haptic(8)
    }
    document.addEventListener('pointerdown', onPointerDown, { passive: true })
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  return null
}
