'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function CtaBand() {
  const scope = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!scope.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      gsap.from('[data-cta-line]', {
        yPercent: 110,
        duration: 0.9,
        stagger: 0.12,
        ease: 'power4.out',
        scrollTrigger: { trigger: scope.current, start: 'top 70%' },
      })
      gsap.from('[data-cta-button]', {
        opacity: 0,
        y: 20,
        duration: 0.7,
        delay: 0.4,
        ease: 'power3.out',
        scrollTrigger: { trigger: scope.current, start: 'top 70%' },
      })
    }, scope)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={scope} className="relative bg-bg-dark py-28 md:py-40 overflow-hidden">
      <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-amber/10 blur-[120px] pointer-events-none" />
      <div className="relative max-w-[900px] mx-auto px-6 md:px-[60px] text-center">
        <h2 className="font-marketing font-semibold text-white text-[42px] md:text-[72px] leading-[1.05] tracking-[-0.02em]">
          <span className="block overflow-hidden pb-1">
            <span data-cta-line className="block">Your platform.</span>
          </span>
          <span className="block overflow-hidden pb-1">
            <span data-cta-line className="block text-amber italic">Your business.</span>
          </span>
        </h2>
        <div data-cta-button className="mt-10">
          <Link
            href="/auth"
            className="inline-block px-10 py-4 rounded-full bg-brand-primary text-white text-base font-semibold font-body hover:opacity-90 transition-opacity"
          >
            Start free
          </Link>
          <p className="mt-4 text-sm text-white/40 font-body">14-day free trial · No credit card · No GST needed</p>
        </div>
      </div>
    </section>
  )
}
