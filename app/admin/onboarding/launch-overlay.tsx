'use client'

import { useEffect, useState } from 'react'

const STATUS_LINES = ['Packing your store…', 'Clearing the launchpad…', 'Liftoff! 🚀']

export function LaunchOverlay() {
  const [lineIndex, setLineIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setLineIndex((current) => Math.min(current + 1, STATUS_LINES.length - 1))
    }, 700)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-gradient-to-br from-brand-primary via-store-primary to-emerald-500">
      <div className="animate-[launchBounce_1.4s_ease-in-out_infinite] text-7xl">🚀</div>
      <p className="font-body text-lg font-semibold text-white">{STATUS_LINES[lineIndex]}</p>
    </div>
  )
}
