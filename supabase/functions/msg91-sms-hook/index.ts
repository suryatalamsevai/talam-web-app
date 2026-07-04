import { createHmac } from 'node:crypto'

const MSG91_API_URL = 'https://api.msg91.com/api/v5/otp'

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Verify Supabase hook signature
  const hookSecret = Deno.env.get('SUPABASE_HOOK_SECRET')
  const signature = req.headers.get('x-supabase-signature')

  if (!hookSecret || !signature) {
    return new Response('Unauthorized', { status: 401 })
  }

  const body = await req.text()
  const expectedSig = createHmac('sha256', hookSecret)
    .update(body)
    .digest('hex')

  if (signature !== expectedSig) {
    return new Response('Unauthorized', { status: 401 })
  }

  const payload = JSON.parse(body)
  const { phone, otp } = payload

  // Call MSG91 OTP API
  const msg91Response = await fetch(
    `${MSG91_API_URL}?authkey=${Deno.env.get('MSG91_AUTH_KEY')}&template_id=${Deno.env.get('MSG91_TEMPLATE_ID')}&mobile=${phone}&otp=${otp}`,
    { method: 'POST' }
  )

  if (!msg91Response.ok) {
    const text = await msg91Response.text()
    console.error('MSG91 error:', text)
    return new Response(JSON.stringify({ error: 'SMS delivery failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
