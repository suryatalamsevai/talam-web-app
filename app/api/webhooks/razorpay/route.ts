import { NextRequest, NextResponse } from 'next/server'
import { verifyRazorpaySignature, handleRazorpayAccountEvent } from '@/lib/razorpay-webhook'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-razorpay-signature')
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET

  if (!secret || !signature || !verifyRazorpaySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'invalid signature' }, { status: 400 })
  }

  const payload = JSON.parse(rawBody) as { event: string; account_id: string }
  await handleRazorpayAccountEvent(payload)

  return NextResponse.json({ ok: true })
}
