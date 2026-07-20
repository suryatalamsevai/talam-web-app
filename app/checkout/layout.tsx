import { headers } from 'next/headers'
import { StoreBaseProvider } from '@/components/store/store-context'

export default async function CheckoutLayout({ children }: { children: React.ReactNode }) {
  const storeBase = (await headers()).get('x-store-base') ?? ''
  return <StoreBaseProvider base={storeBase}>{children}</StoreBaseProvider>
}
