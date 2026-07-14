import { Store, ShoppingBag, CreditCard, Truck, Palette, Smartphone } from 'lucide-react'

const FEATURES = [
  {
    icon: Store,
    title: 'Your own storefront',
    desc: 'A Myntra-quality store under your own brand name — yourstore.talam4shop.com.',
  },
  {
    icon: ShoppingBag,
    title: 'Orders, organised',
    desc: 'Track, fulfill, and manage every order from one dashboard. No more scrolling DMs.',
  },
  {
    icon: CreditCard,
    title: 'Every way to pay',
    desc: 'UPI, cards, net banking, COD — your customers pay the way they already know.',
  },
  {
    icon: Truck,
    title: 'Shipping built in',
    desc: 'Shiprocket integration ships anywhere in India with live tracking for customers.',
  },
  {
    icon: Palette,
    title: 'It looks like yours',
    desc: 'Your colours, your logo, your story. Nobody has to know Talam is underneath.',
  },
  {
    icon: Smartphone,
    title: 'Run it from your phone',
    desc: 'The whole admin is mobile-first. Manage your business at 10pm from the sofa.',
  },
]

export function Features() {
  return (
    <section id="features" className="relative bg-surface py-24 md:py-32 overflow-hidden">
      <div className="absolute -top-20 -right-20 w-[300px] h-[300px] rounded-full bg-brand-primary/5 pointer-events-none" />
      <div className="absolute -bottom-16 -left-16 w-[200px] h-[200px] rounded-full border-2 border-amber/10 pointer-events-none" />
      <div className="relative max-w-[1200px] mx-auto px-6 md:px-[60px]">
        <div className="max-w-[560px] mb-14">
          <h2 className="font-marketing font-semibold text-fg text-[34px] md:text-[48px] leading-[1.1] tracking-[-0.01em]">
            Everything a real store needs. Nothing you have to build.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-xl bg-bg border border-border-light p-7 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-brand-primary/5"
            >
              <div className="w-11 h-11 rounded-lg bg-brand-primary/10 flex items-center justify-center mb-5 transition-colors duration-300 group-hover:bg-amber/20">
                <Icon className="w-5 h-5 text-brand-primary transition-colors duration-300 group-hover:text-amber" />
              </div>
              <h3 className="font-body font-semibold text-fg text-lg mb-2">{title}</h3>
              <p className="font-body text-sm text-muted-warm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
