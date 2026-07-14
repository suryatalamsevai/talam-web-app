'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

const STEPS = [
  {
    n: '1',
    title: 'Name your store',
    desc: 'Pick a name, choose your colours, upload your logo. Your brand, front and centre.',
  },
  {
    n: '2',
    title: 'Add your first product',
    desc: "Photos from your phone, a price, a description. That's a live product page.",
  },
  {
    n: '3',
    title: 'Go live & share your link',
    desc: 'Drop your store link in your Instagram bio and WhatsApp status. Start selling.',
  },
]

export function HowItWorks() {
  const scope = useRef<HTMLElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!scope.current) return
    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia()
      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        const track = trackRef.current!
        gsap.to(track, {
          x: () => -(track.scrollWidth - window.innerWidth),
          ease: 'none',
          scrollTrigger: {
            trigger: scope.current,
            start: 'top top',
            end: () => `+=${track.scrollWidth - window.innerWidth}`,
            pin: true,
            scrub: 0.5,
            invalidateOnRefresh: true,
          },
        })
      })
      mm.add('(max-width: 1023px) and (prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-step]', {
          opacity: 0,
          y: 40,
          duration: 0.7,
          stagger: 0.15,
          ease: 'power3.out',
          scrollTrigger: { trigger: scope.current, start: 'top 70%' },
        })
      })
    }, scope)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={scope} className="bg-bg-dark overflow-hidden">
      <div className="pt-24 lg:pt-32 px-6 md:px-[60px] max-w-[1200px] mx-auto">
        <div className="text-xs uppercase tracking-[0.2em] text-amber font-body mb-4">How it works</div>
        <h2 className="font-marketing font-semibold text-white text-[34px] md:text-[48px] leading-[1.1] tracking-[-0.01em] max-w-[560px]">
          Live in 14 minutes. Really.
        </h2>
      </div>

      <div ref={trackRef} className="flex flex-col lg:flex-row lg:w-max gap-10 lg:gap-0 px-6 md:px-[60px] py-16 lg:py-24">
        {STEPS.map((step) => (
          <div
            key={step.n}
            data-step
            className="lg:w-[70vw] lg:max-w-[760px] lg:shrink-0 lg:pr-24 flex flex-col justify-center"
          >
            <div className="font-marketing font-semibold text-amber text-[90px] lg:text-[160px] leading-none opacity-90">
              {step.n}
            </div>
            <h3 className="font-marketing font-medium text-white text-[26px] lg:text-[38px] mt-4 mb-3">
              {step.title}
            </h3>
            <p className="font-body text-white/50 text-base lg:text-lg leading-relaxed max-w-[440px]">
              {step.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
