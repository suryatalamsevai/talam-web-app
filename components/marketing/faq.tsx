import { Plus } from 'lucide-react'

const FAQS = [
  {
    q: 'Do I need GST registration to start?',
    a: 'No. You can start selling on Talam without GST or MSME registration. Add your GST details later if your business grows past the threshold.',
  },
  {
    q: 'How long does setup take?',
    a: 'About 14 minutes. Name your store, add a product, connect payments, and go live — all from your phone.',
  },
  {
    q: 'Can I use my own domain?',
    a: 'Yes, on the Pro plan. Every store gets a free yourstore.talam4shop.com address, and Pro lets you connect a custom domain like yourstore.com.',
  },
  {
    q: 'What payment methods do my customers get?',
    a: 'UPI, credit and debit cards, net banking, and cash on delivery — via Razorpay or Instamojo, settled directly to your bank account.',
  },
  {
    q: 'Is there a free trial?',
    a: 'Yes — 14 days, full access, no credit card required. If Talam isn\'t for you, walk away with nothing owed.',
  },
  {
    q: 'Can I switch plans later?',
    a: 'Anytime. Upgrade or downgrade from your dashboard and the change applies from your next billing cycle.',
  },
]

export function Faq() {
  return (
    <section id="faq" className="bg-surface py-24 md:py-32 border-t border-border-light">
      <div className="max-w-[760px] mx-auto px-6 md:px-[60px]">
        <h2 className="font-marketing font-semibold text-fg text-[34px] md:text-[48px] leading-[1.1] tracking-[-0.01em] mb-12">
          Questions, answered.
        </h2>

        <div className="flex flex-col divide-y divide-border-light border-y border-border-light">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="marketing-reveal group py-5">
              <summary className="flex items-center justify-between cursor-pointer list-none font-body font-medium text-fg text-base md:text-lg [&::-webkit-details-marker]:hidden">
                {q}
                <Plus className="w-5 h-5 text-muted-warm shrink-0 ml-4 transition-transform duration-200 group-open:rotate-45" />
              </summary>
              <p className="mt-3 text-sm md:text-base text-muted-warm font-body leading-relaxed pr-8">
                {a}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
