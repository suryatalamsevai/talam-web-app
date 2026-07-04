import { headers } from 'next/headers'

export default async function StorePage() {
  const headersList = await headers()
  const tenantId = headersList.get('x-tenant-id')
  const subdomain = headersList.get('x-subdomain')

  return (
    <main>
      <h1>Store: {subdomain}</h1>
      <p>Tenant ID: {tenantId}</p>
    </main>
  )
}
