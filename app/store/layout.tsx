import { headers } from 'next/headers'
import { notFound } from 'next/navigation'

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')

  if (!tenantId) notFound()

  return <>{children}</>
}
