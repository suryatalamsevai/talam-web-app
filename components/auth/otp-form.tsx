'use client'

import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Step = 'phone' | 'otp'

export function OtpForm() {
  const [step, setStep] = useState<Step>('phone')
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const supabase = createBrowserClient()

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length !== 10) {
      setError('Enter a valid 10-digit mobile number')
      return
    }

    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      phone: `+91${cleaned}`,
    })
    setLoading(false)

    if (error) {
      setError(error.message)
      return
    }

    setStep('otp')
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { error } = await supabase.auth.verifyOtp({
      phone: `+91${phone.replace(/\D/g, '')}`,
      token: otp,
      type: 'sms',
    })
    setLoading(false)

    if (error) {
      setError(error.message)
    }
    // On success, Supabase sets the session cookie and redirects via the auth state listener
  }

  if (step === 'otp') {
    return (
      <form onSubmit={handleVerifyOtp} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="otp">Enter OTP</Label>
          <Input
            id="otp"
            placeholder="6-digit OTP"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            maxLength={6}
            inputMode="numeric"
            autoComplete="one-time-code"
          />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? 'Verifying…' : 'Verify OTP'}
        </Button>
        <button
          type="button"
          onClick={() => { setStep('phone'); setError('') }}
          className="text-sm text-muted-foreground underline w-full text-center"
        >
          Change number
        </button>
      </form>
    )
  }

  return (
    <form onSubmit={handleSendOtp} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="phone">Mobile Number</Label>
        <div className="flex">
          <span className="flex items-center px-3 border border-r-0 rounded-l-md bg-muted text-sm text-muted-foreground">
            +91
          </span>
          <Input
            id="phone"
            placeholder="Mobile number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="rounded-l-none"
            inputMode="tel"
            autoComplete="tel-national"
            maxLength={10}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? 'Sending…' : 'Send OTP'}
      </Button>
    </form>
  )
}
