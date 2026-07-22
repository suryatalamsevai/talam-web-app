import HowItWorksCards, { type Step } from '@/components/ui/how-it-works'

const STEPS: Step[] = [
  {
    title: 'Name your store',
    description: 'Pick a name, choose your colours, upload your logo. Your brand, front and centre.',
    colorTheme: 'orange',
  },
  {
    title: 'Add your first product',
    description: "Photos from your phone, a price, a description. That's a live product page.",
    colorTheme: 'blue',
  },
  {
    title: 'Go live & share your link',
    description: 'Drop your store link in your Instagram bio and WhatsApp status. Start selling.',
    colorTheme: 'purple',
  },
]

export function HowItWorks() {
  return <HowItWorksCards features={STEPS} />
}
