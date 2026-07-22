'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { useForm, Controller, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCartStore } from '@/lib/store/cart'
import { CheckoutHeader } from '@/components/checkout/checkout-header'
import { StepIndicator } from '@/components/checkout/step-indicator'
import { OrderSummaryCard, TrustBar } from '@/components/checkout/order-summary-card'
import { GoogleButton } from '@/components/auth/google-button'
import { useStoreBase } from '@/components/store/store-context'
import { createBrowserClient } from '@/lib/supabase/client'
import { formatCurrency } from '@/lib/utils'

// ponytail: inline tenant config until SSR wrapper is added
const tenant = { name: 'Talam Store', freeDeliveryAbove: 999, shippingFee: 99 }

const addressSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  phone: z.string().trim().min(1, 'Phone is required'),
  line1: z.string().trim().min(1, 'Address line 1 is required'),
  line2: z.string().optional(),
  pincode: z.string().trim().min(1, 'Pincode is required'),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
})
type Address = z.infer<typeof addressSchema>

const EMPTY_ADDRESS: Address = { name: '', phone: '', line1: '', line2: '', pincode: '', city: '', state: '' }
const INDIAN_STATES = ['Tamil Nadu', 'Karnataka', 'Kerala', 'Andhra Pradesh', 'Telangana', 'Maharashtra', 'Delhi']

function fieldClass(hasError: boolean) {
  return `h-auto w-full rounded-lg border-[1.5px] px-[14px] py-[13px] font-body text-sm text-fg outline-none transition-colors focus:border-store-primary ${
    hasError ? 'border-danger' : 'border-border'
  }`
}

function CouponField() {
  const [code, setCode] = useState('')
  const [applied, setApplied] = useState<string | null>(null)
  return (
    <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
      <h3 className="mb-2.5 font-heading text-sm font-bold text-fg">Have a coupon?</h3>
      <div className="flex gap-2">
        <input
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Enter coupon code"
          className="h-10 flex-1 rounded-lg border border-border px-3 font-body text-sm text-fg placeholder:text-muted-warm/60 focus:border-store-primary focus:outline-none"
        />
        <button
          onClick={() => { if (code.trim()) setApplied(code.trim()) }}
          className="h-10 shrink-0 rounded-lg bg-fg px-4 font-body text-sm font-semibold text-surface hover:opacity-90"
        >
          Apply
        </button>
      </div>
      {applied && (
        <p className="mt-2 font-body text-xs font-medium text-success">{applied} applied</p>
      )}
    </div>
  )
}

export default function CheckoutPage() {
  const router = useRouter()
  const items = useCartStore(s => s.items)
  const clear = useCartStore(s => s.clear)
  const storeBase = useStoreBase()

  const [step, setStep] = useState<1 | 2 | 3>(1)

  // Step 1 — details
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    const supabase = createBrowserClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setVerified(true)
        setStep((current) => (current === 1 ? 2 : current))
      }
    })
  }, [])

  // Step 2 — address
  const { control: addressControl, trigger: triggerAddress } = useForm<Address>({
    resolver: zodResolver(addressSchema),
    defaultValues: EMPTY_ADDRESS,
  })
  const address = useWatch({ control: addressControl })

  // Step 3 — payment
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'instamojo' | 'razorpay'>('upi')
  const [utr, setUtr] = useState('')
  const [placing, setPlacing] = useState(false)
  const [orderPlaced, setOrderPlaced] = useState(false)

  const subtotal = items.reduce((s, i) => s + (i.comparePrice && i.comparePrice > i.price ? i.comparePrice : i.price) * i.quantity, 0)
  const saleTotal = items.reduce((s, i) => s + i.price * i.quantity, 0)
  const discount = subtotal - saleTotal
  const freeDeliveryThreshold = tenant.freeDeliveryAbove ?? 0
  const shippingFee = freeDeliveryThreshold > 0 && saleTotal >= freeDeliveryThreshold ? 0 : Number(tenant.shippingFee)
  const total = saleTotal + shippingFee

  if (items.length === 0 && !orderPlaced) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
        <p className="font-body text-sm text-muted-warm">Your cart is empty.</p>
        <button onClick={() => router.push('/cart')} className="mt-4 font-body text-sm font-semibold text-store-primary">← Back to Cart</button>
      </main>
    )
  }

  if (placing) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-3 px-4 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-store-primary" />
        <p className="font-body text-sm font-medium text-fg">Placing your order…</p>
      </main>
    )
  }

  function handleSendOtp() {
    if (phone.replace(/\D/g, '').length !== 10) return
    setOtpSent(true)
  }

  function handleVerifyOtp() {
    if (otp.length !== 4) return
    setVerified(true)
    setStep(2)
  }

  async function handleContinueFromAddress() {
    if (await triggerAddress()) setStep(3)
  }

  function handlePlaceOrder() {
    if (placing) return
    setPlacing(true)
    const order = {
      orderId: `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      placedAt: new Date().toISOString(),
      items,
      subtotal,
      discount,
      shippingFee,
      total,
      address,
      paymentMethod,
    }
    sessionStorage.setItem('talam-last-order', JSON.stringify(order))
    setTimeout(() => {
      setOrderPlaced(true)
      clear()
      router.push('/checkout/confirmed')
    }, 2000)
  }

  const payLabel = step === 1 ? `Pay ${formatCurrency(total)}` : step === 2 ? 'Continue to Payment' : 'Place Order'

  function handleStickyBarClick() {
    if (step === 1) {
      if (!otpSent) handleSendOtp()
      else handleVerifyOtp()
    } else if (step === 2) {
      handleContinueFromAddress()
    } else {
      handlePlaceOrder()
    }
  }

  return (
    <div className="min-h-screen bg-bg pb-28 sm:pb-10">
      <CheckoutHeader
        storeName={tenant.name}
        onBack={step === 1 ? () => router.push('/cart') : () => setStep((s) => (s - 1) as 1 | 2)}
      />
      <StepIndicator current={step} />

      <main className="mx-auto max-w-5xl px-4 pb-4 sm:px-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Main column */}
          <div className="min-w-0 flex-1 space-y-3">
            {step === 1 && (
              <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
                {verified ? (
                  <div className="flex items-center justify-between rounded-lg border border-success/20 bg-success/[0.08] px-3.5 py-3">
                    <div className="flex items-center gap-2">
                      <Check className="h-[18px] w-[18px] text-success" />
                      <span className="font-body text-sm font-medium text-fg">Verified</span>
                    </div>
                    <span className="font-body text-sm text-muted-warm">+91 {phone}</span>
                  </div>
                ) : (
                  <>
                    <label className="mb-1.5 block font-body text-[13px] font-bold text-fg">Mobile Number</label>
                    <div className="flex items-center overflow-hidden rounded-lg border-[1.5px] border-border focus-within:border-store-primary">
                      <span className="shrink-0 border-r border-border px-3 py-[13px] font-body text-sm text-fg">+91</span>
                      <input
                        value={phone}
                        onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                        placeholder="98765 43210"
                        inputMode="tel"
                        className="h-auto w-full border-0 px-3 py-[13px] font-body text-sm text-fg outline-none"
                      />
                    </div>
                    <p className="mt-1.5 font-body text-xs text-muted-warm">We&apos;ll send a 4-digit OTP to verify your number</p>

                    {!otpSent ? (
                      <button
                        onClick={handleSendOtp}
                        className="mt-4 h-12 w-full rounded-[10px] bg-store-primary font-body text-[16px] font-bold text-surface hover:opacity-90 active:scale-[0.99]"
                      >
                        Send OTP
                      </button>
                    ) : (
                      <>
                        <label className="mb-1.5 mt-4 block font-body text-[13px] font-bold text-fg">Enter OTP</label>
                        <input
                          value={otp}
                          onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="4-digit OTP"
                          inputMode="numeric"
                          maxLength={4}
                          className="h-auto w-full rounded-lg border-[1.5px] border-border px-3.5 py-[13px] font-body text-sm text-fg outline-none focus:border-store-primary"
                        />
                        <button
                          onClick={handleVerifyOtp}
                          className="mt-4 h-12 w-full rounded-[10px] bg-store-primary font-body text-[16px] font-bold text-surface hover:opacity-90 active:scale-[0.99]"
                        >
                          Verify OTP
                        </button>
                      </>
                    )}

                    <div className="my-5 flex items-center gap-3">
                      <span className="h-px flex-1 bg-border-light" />
                      <span className="font-body text-[11px] text-muted-warm">or continue with</span>
                      <span className="h-px flex-1 bg-border-light" />
                    </div>

                    <GoogleButton redirectPath={`${storeBase}/auth/callback`} next="/checkout" />
                  </>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="rounded-xl border border-border bg-surface p-4 sm:p-6">
                <h2 className="mb-4 font-heading text-base font-bold text-fg">Delivery Address</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="mb-1.5 block font-body text-[13px] font-bold text-fg">Name<span className="text-danger">*</span></label>
                    <Controller
                      control={addressControl}
                      name="name"
                      render={({ field, fieldState }) => (
                        <>
                          <input {...field} className={fieldClass(!!fieldState.error)} />
                          {fieldState.error ? <p className="mt-1 font-body text-xs text-danger">{fieldState.error.message}</p> : null}
                        </>
                      )}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1.5 block font-body text-[13px] font-bold text-fg">Phone<span className="text-danger">*</span></label>
                    <Controller
                      control={addressControl}
                      name="phone"
                      render={({ field, fieldState }) => (
                        <>
                          <input {...field} className={fieldClass(!!fieldState.error)} />
                          {fieldState.error ? <p className="mt-1 font-body text-xs text-danger">{fieldState.error.message}</p> : null}
                        </>
                      )}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1.5 block font-body text-[13px] font-bold text-fg">Address line 1<span className="text-danger">*</span></label>
                    <Controller
                      control={addressControl}
                      name="line1"
                      render={({ field, fieldState }) => (
                        <>
                          <input {...field} className={fieldClass(!!fieldState.error)} />
                          {fieldState.error ? <p className="mt-1 font-body text-xs text-danger">{fieldState.error.message}</p> : null}
                        </>
                      )}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="mb-1.5 block font-body text-[13px] font-bold text-fg">Address line 2 (optional)</label>
                    <Controller
                      control={addressControl}
                      name="line2"
                      render={({ field }) => <input {...field} className={fieldClass(false)} />}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-body text-[13px] font-bold text-fg">Pincode<span className="text-danger">*</span></label>
                    <Controller
                      control={addressControl}
                      name="pincode"
                      render={({ field, fieldState }) => (
                        <>
                          <input
                            {...field}
                            onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            className={fieldClass(!!fieldState.error)}
                          />
                          {fieldState.error ? <p className="mt-1 font-body text-xs text-danger">{fieldState.error.message}</p> : null}
                        </>
                      )}
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block font-body text-[13px] font-bold text-fg">City<span className="text-danger">*</span></label>
                    <Controller
                      control={addressControl}
                      name="city"
                      render={({ field, fieldState }) => (
                        <>
                          <input {...field} className={fieldClass(!!fieldState.error)} />
                          {fieldState.error ? <p className="mt-1 font-body text-xs text-danger">{fieldState.error.message}</p> : null}
                        </>
                      )}
                    />
                  </div>
                  <div className="col-span-2 relative">
                    <label className="mb-1.5 block font-body text-[13px] font-bold text-fg">State<span className="text-danger">*</span></label>
                    <Controller
                      control={addressControl}
                      name="state"
                      render={({ field, fieldState }) => (
                        <>
                          <select {...field} className={`${fieldClass(!!fieldState.error)} appearance-none bg-surface`}>
                            <option value="">Select state</option>
                            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          {fieldState.error ? <p className="mt-1 font-body text-xs text-danger">{fieldState.error.message}</p> : null}
                        </>
                      )}
                    />
                    <ChevronDown className="pointer-events-none absolute right-3.5 top-[38px] h-4 w-4 text-muted-warm" />
                  </div>
                </div>

                <button
                  onClick={handleContinueFromAddress}
                  className="mt-5 h-12 w-full rounded-[10px] bg-store-primary font-body text-[16px] font-bold text-surface hover:opacity-90 active:scale-[0.99]"
                >
                  Continue to Payment
                </button>
              </div>
            )}

            {step === 3 && (
              <>
                <div className="rounded-xl border border-border bg-surface p-4 sm:p-5">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="font-body text-[13px] font-bold text-fg">Delivering To</span>
                    <button onClick={() => setStep(2)} className="font-body text-xs font-semibold text-store-primary">Edit</button>
                  </div>
                  <p className="font-body text-sm text-fg">{address.name}</p>
                  <p className="font-body text-sm text-muted-warm">{[address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(', ')}</p>
                  <p className="font-body text-sm text-muted-warm">{address.phone}</p>
                </div>

                <div className="mt-3 flex flex-col gap-2.5">
                  {/* UPI */}
                  <div
                    onClick={() => setPaymentMethod('upi')}
                    className={`cursor-pointer rounded-[10px] border-[1.5px] p-4 ${paymentMethod === 'upi' ? 'border-store-primary' : 'border-border'}`}
                  >
                    <div className="flex items-center gap-3">
                      <input type="radio" checked={paymentMethod === 'upi'} onChange={() => setPaymentMethod('upi')} className="h-5 w-5 accent-store-primary" />
                      <div className="flex h-7 w-10 shrink-0 items-center justify-center rounded bg-bg font-body text-[11px] font-bold text-fg">UPI</div>
                      <div>
                        <p className="font-body text-[15px] font-bold text-fg">UPI</p>
                        <p className="font-body text-xs text-muted-warm">Pay via any UPI app — instant confirmation</p>
                      </div>
                    </div>
                    {paymentMethod === 'upi' && (
                      <div className="mt-4 border-t border-border pt-4">
                        <div className="mx-auto h-[120px] w-[120px] rounded-lg bg-[repeating-conic-gradient(var(--border)_0%_25%,var(--color-bg)_0%_50%)] bg-[length:12px_12px]" />
                        <p className="mt-3 text-center font-body text-[12px] uppercase tracking-[0.04em] text-muted-warm">UPI ID</p>
                        <p className="break-all text-center font-body text-[15px] font-bold text-fg">{tenant.name.toLowerCase().replace(/\s+/g, '')}@upi</p>
                        <p className="mt-3 font-body text-[13px] leading-[1.6] text-muted-warm">
                          1. Open any UPI app and scan the QR code<br />
                          2. Pay {formatCurrency(total)} to complete the order<br />
                          3. Enter the 12-digit UTR number below to confirm
                        </p>
                        <label className="mb-1.5 mt-3 block font-body text-[13px] font-bold text-fg">UTR Number</label>
                        <input
                          value={utr}
                          onChange={e => setUtr(e.target.value.replace(/\D/g, '').slice(0, 12))}
                          placeholder="12-digit reference number"
                          className="h-auto w-full rounded-lg border-[1.5px] border-border px-[13px] py-[11px] font-body text-[15px] text-fg outline-none focus:border-store-primary"
                        />
                        <p className="mt-1 font-body text-xs text-muted-warm">12-digit reference number from your payment app</p>
                        <button
                          onClick={handlePlaceOrder}
                          disabled={utr.length !== 12 || placing}
                          className="mt-4 h-12 w-full rounded-[10px] bg-store-primary font-body text-[16px] font-bold text-surface hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
                        >
                          Confirm Payment
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Instamojo */}
                  <div
                    onClick={() => setPaymentMethod('instamojo')}
                    className={`cursor-pointer rounded-[10px] border-[1.5px] p-4 ${paymentMethod === 'instamojo' ? 'border-store-primary' : 'border-border'}`}
                  >
                    <div className="flex items-center gap-3">
                      <input type="radio" checked={paymentMethod === 'instamojo'} onChange={() => setPaymentMethod('instamojo')} className="h-5 w-5 accent-store-primary" />
                      <div className="flex h-7 w-10 shrink-0 items-center justify-center rounded bg-bg-dark font-body text-[11px] font-bold text-blue-300">IM</div>
                      <div>
                        <p className="font-body text-[15px] font-bold text-fg">Instamojo</p>
                        <p className="font-body text-xs text-muted-warm">Cards, netbanking &amp; wallets</p>
                      </div>
                    </div>
                    {paymentMethod === 'instamojo' && (
                      <p className="mt-3 border-t border-border pt-3 font-body text-[13px] leading-[1.5] text-muted-warm">
                        You&apos;ll be redirected to Instamojo to complete your payment securely.
                      </p>
                    )}
                  </div>

                  {/* Razorpay */}
                  <div
                    onClick={() => setPaymentMethod('razorpay')}
                    className={`cursor-pointer rounded-[10px] border-[1.5px] p-4 ${paymentMethod === 'razorpay' ? 'border-store-primary' : 'border-border'}`}
                  >
                    <div className="flex items-center gap-3">
                      <input type="radio" checked={paymentMethod === 'razorpay'} onChange={() => setPaymentMethod('razorpay')} className="h-5 w-5 accent-store-primary" />
                      <div className="flex h-7 w-10 shrink-0 items-center justify-center rounded bg-bg-dark font-body text-[11px] font-bold text-indigo-300">RZ</div>
                      <div>
                        <p className="font-body text-[15px] font-bold text-fg">Razorpay</p>
                        <p className="font-body text-xs text-muted-warm">Cards, netbanking &amp; wallets</p>
                      </div>
                    </div>
                    {paymentMethod === 'razorpay' && (
                      <p className="mt-3 border-t border-border pt-3 font-body text-[13px] leading-[1.5] text-muted-warm">
                        You&apos;ll be redirected to Razorpay to complete your payment securely.
                      </p>
                    )}
                  </div>
                </div>

                {paymentMethod !== 'upi' && (
                  <button
                    onClick={handlePlaceOrder}
                    disabled={placing}
                    className="mt-4 h-12 w-full rounded-[10px] bg-store-primary font-body text-[16px] font-bold text-surface hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
                  >
                    Place Order
                  </button>
                )}
              </>
            )}

            {/* Order summary + coupon + trust bar — every step, mobile position */}
            <div className="space-y-3 sm:hidden">
              <OrderSummaryCard items={items} subtotal={subtotal} discount={discount} shippingFee={shippingFee} total={total} />
              <CouponField />
              <TrustBar />
            </div>
          </div>

          {/* Sidebar — desktop */}
          <div className="hidden w-[360px] shrink-0 space-y-3 sm:block">
            <OrderSummaryCard items={items} subtotal={subtotal} discount={discount} shippingFee={shippingFee} total={total} />
            <CouponField />
            <TrustBar />
          </div>
        </div>
      </main>

      {/* Sticky pay bar — mobile only */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-surface px-4 py-3 sm:hidden">
        <div>
          <p className="font-body text-[13px] text-muted-warm">Order Total</p>
          <p className="font-body text-[20px] font-bold text-fg">{formatCurrency(total)}</p>
        </div>
        {!(step === 3 && paymentMethod === 'upi') && (
          <button
            onClick={handleStickyBarClick}
            className="h-12 shrink-0 rounded-[10px] bg-store-primary px-6 font-body text-[15px] font-bold text-surface hover:opacity-90 active:scale-[0.99]"
          >
            {step === 1 ? (otpSent ? 'Verify OTP' : payLabel) : payLabel}
          </button>
        )}
      </div>
    </div>
  )
}
