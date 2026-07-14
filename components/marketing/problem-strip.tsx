'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function ProblemStrip() {
  const scope = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!scope.current) return
    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: scope.current,
            start: 'top top',
            end: '+=120%',
            pin: true,
            scrub: 0.5,
          },
        })
        tl.to('[data-today]', { opacity: 0, y: -40, duration: 1 })
          .fromTo('[data-tomorrow]', { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1 }, '<0.3')
      })
      mm.add('(max-width: 767px), (prefers-reduced-motion: reduce)', () => {
        gsap.set('[data-today]', { opacity: 1, position: 'relative' })
        gsap.set('[data-tomorrow]', { opacity: 1, position: 'relative' })
      })
    }, scope)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={scope} className="relative bg-bg py-24 md:py-0 md:min-h-screen md:flex md:items-center overflow-hidden">
      <div className="relative w-full max-w-[1100px] mx-auto px-6 md:px-[60px] md:grid md:place-items-center">
        <div data-today className="md:col-start-1 md:row-start-1 text-center mb-16 md:mb-0">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-warm font-body mb-4">Today</div>
          <p className="font-marketing font-medium text-fg text-[32px] md:text-[52px] leading-[1.15] tracking-[-0.01em]">
            Screenshots, DMs,<br />
            UPI requests, <span className="text-danger">lost orders</span>.
          </p>
        </div>
        <div data-tomorrow className="md:col-start-1 md:row-start-1 md:opacity-0 text-center">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-warm font-body mb-4">Tomorrow</div>
          <p className="font-marketing font-medium text-fg text-[32px] md:text-[52px] leading-[1.15] tracking-[-0.01em]">
            <span className="text-brand-primary">yourstore</span>.talam4shop.com
          </p>
          <p className="mt-4 text-base text-muted-warm font-body">One link. Every order in one place.</p>
        </div>
      </div>
    </section>
  )
}
