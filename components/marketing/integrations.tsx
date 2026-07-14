'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { CreditCard, Truck } from 'lucide-react'

const ROWS = [
  {
    icon: CreditCard,
    label: 'Payments',
    partners: ['Razorpay', 'UPI', 'Instamojo'],
    desc: 'UPI, cards, net banking, and cash on delivery — settled to your bank account.',
  },
  {
    icon: Truck,
    label: 'Logistics',
    partners: ['Shiprocket'],
    desc: 'Pan-India shipping with live tracking and automatic customer notifications.',
  },
]

export function Integrations() {
  const scope = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!scope.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    gsap.registerPlugin(ScrollTrigger)
    const ctx = gsap.context(() => {
      gsap.from('[data-integration-row]', {
        opacity: 0,
        y: 30,
        duration: 0.7,
        stagger: 0.15,
        ease: 'power3.out',
        scrollTrigger: { trigger: scope.current, start: 'top 75%' },
      })
    }, scope)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={scope} className="bg-surface py-24 md:py-32 border-t border-border-light">
      <div className="max-w-[1000px] mx-auto px-6 md:px-[60px]">
        <h2 className="font-marketing font-semibold text-fg text-[34px] md:text-[48px] leading-[1.1] tracking-[-0.01em] mb-14 max-w-[560px]">
          Works with what India already uses.
        </h2>

        <div className="flex flex-col gap-6">
          {ROWS.map(({ icon: Icon, label, partners, desc }) => (
            <div
              key={label}
              data-integration-row
              className="flex flex-col md:flex-row md:items-center gap-5 rounded-xl border border-border-light bg-bg p-7"
            >
              <div className="flex items-center gap-4 md:w-[180px] shrink-0">
                <div className="w-11 h-11 rounded-lg bg-brand-primary/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-brand-primary" />
                </div>
                <span className="font-body font-semibold text-fg text-lg">{label}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 md:w-[320px] shrink-0">
                {partners.map((p) => (
                  <span
                    key={p}
                    className="px-4 py-2 rounded-full border border-border-light bg-surface text-sm font-semibold text-fg font-body"
                  >
                    {p}
                  </span>
                ))}
              </div>
              <p className="font-body text-sm text-muted-warm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
