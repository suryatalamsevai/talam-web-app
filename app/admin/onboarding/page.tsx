'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft } from 'lucide-react'

import { BrandStep } from './brand-step'
import { GoLiveStep } from './go-live-step'
import { STEP_ACCENTS, STEPS, type BrandColor, type PaymentId } from './onboarding-data'
import { PaymentStep } from './payment-step'
import { ProductStep } from './product-step'
import { StoreStep } from './store-step'

export const dynamic = 'force-dynamic'

export default function OnboardingPage() {
  const [step, setStep] = useState(0)
  const [storeName, setStoreName] = useState("Priya's Boutique")
  const [category, setCategory] = useState('Clothing')
  const [brandColor, setBrandColor] = useState<BrandColor>('#4F3FF0')
  const [brandLogo, setBrandLogo] = useState<File | null>(null)
  const [productName, setProductName] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productStock, setProductStock] = useState('')
  const [productPhoto, setProductPhoto] = useState<File | null>(null)
  const [paymentId, setPaymentId] = useState<PaymentId>('upi')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const slug = useMemo(
    () =>
      storeName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'your-store',
    [storeName]
  )

  function validateStep(current: number): Record<string, string> {
    if (current === 0) {
      const stepErrors: Record<string, string> = {}
      if (!storeName.trim()) stepErrors.storeName = 'Store name is required'
      if (!category) stepErrors.category = 'Select a category'
      return stepErrors
    }
    if (current === 2) {
      const stepErrors: Record<string, string> = {}
      if (!productName.trim()) stepErrors.productName = 'Product name is required'
      if (!productPrice.trim() || Number(productPrice) <= 0) stepErrors.productPrice = 'Enter a valid price'
      if (!productStock.trim() || Number(productStock) < 0) stepErrors.productStock = 'Enter a valid stock quantity'
      return stepErrors
    }
    return {}
  }

  function goNext() {
    const stepErrors = validateStep(step)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }
    setErrors({})
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  function goSkip() {
    setErrors({})
    setStep((current) => Math.min(current + 1, STEPS.length - 1))
  }

  function goBack() {
    setErrors({})
    setStep((current) => Math.max(current - 1, 0))
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-surface font-body text-fg">
      <BackgroundWash step={step} />
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[560px] flex-col px-6 pb-32 pt-9 md:pb-16 md:pt-14">
        <ProgressHeader step={step} />
        <section className="relative mt-7 flex-1 rounded-3xl border border-white/70 bg-surface/90 p-7 shadow-[0_24px_70px_-20px_rgba(31,41,55,0.25)] backdrop-blur-sm md:p-11">
          <BackNav step={step} goBack={goBack} />
          {step === 0 ? (
            <StoreStep
              slug={slug}
              storeName={storeName}
              setStoreName={setStoreName}
              category={category}
              setCategory={setCategory}
              errors={errors}
            />
          ) : null}
          {step === 1 ? (
            <BrandStep brandColor={brandColor} setBrandColor={setBrandColor} brandLogo={brandLogo} setBrandLogo={setBrandLogo} />
          ) : null}
          {step === 2 ? (
            <ProductStep
              productName={productName}
              setProductName={setProductName}
              productPrice={productPrice}
              setProductPrice={setProductPrice}
              productStock={productStock}
              setProductStock={setProductStock}
              productPhoto={productPhoto}
              setProductPhoto={setProductPhoto}
              errors={errors}
            />
          ) : null}
          {step === 3 ? <PaymentStep paymentId={paymentId} setPaymentId={setPaymentId} /> : null}
          {step === 4 ? <GoLiveStep slug={slug} /> : null}
          <DesktopFooter step={step} goSkip={goSkip} goNext={goNext} />
        </section>
      </div>
      <MobileFooter step={step} goSkip={goSkip} goNext={goNext} />
    </main>
  )
}

function BackgroundWash({ step }: { readonly step: number }) {
  const accent = STEP_ACCENTS[step]
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div
        className="absolute -left-32 -top-40 size-[420px] rounded-full opacity-30 blur-3xl transition-[background] duration-700 md:size-[520px]"
        style={{ background: accent.wash }}
      />
      <div
        className="absolute -bottom-44 -right-28 size-[460px] rounded-full opacity-25 blur-3xl transition-[background] duration-700 md:size-[560px]"
        style={{ background: accent.wash }}
      />
      <div className="absolute inset-0 bg-surface/75" />
    </div>
  )
}

function ProgressHeader({ step }: { readonly step: number }) {
  const accent = STEP_ACCENTS[step]
  return (
    <header>
      <div className="flex items-center justify-between">
        <span className="font-heading text-[22px] font-bold leading-7 tracking-[-0.02em] text-[#1F2937]">
          talam<span className={['transition-colors duration-500', accent.text].join(' ')}>.</span>
        </span>
        <span className="font-body text-xs font-semibold uppercase leading-tight tracking-[0.06em] text-[#9CA3AF]">
          Step {step + 1} of {STEPS.length}
        </span>
      </div>
      <div className="mt-4 flex gap-1.5">
        {STEPS.map((item, index) => (
          <div
            key={item.title}
            className={[
              'h-1.5 flex-1 rounded-full transition-colors duration-500',
              index <= step ? STEP_ACCENTS[index].solid : 'bg-[#E5E7EB]',
            ].join(' ')}
          />
        ))}
      </div>
    </header>
  )
}

function BackNav({ step, goBack }: { readonly step: number; readonly goBack: () => void }) {
  if (step === 0 || step === 4) return null

  return (
    <button
      type="button"
      onClick={goBack}
      className="mb-6 flex cursor-pointer items-center gap-1.5 self-start font-body text-sm font-semibold leading-[18px] text-[#374151] transition-colors hover:text-brand-primary"
    >
      <ArrowLeft className="size-4" strokeWidth={2.2} />
      Back
    </button>
  )
}

function DesktopFooter({ step, goSkip, goNext }: { readonly step: number; readonly goSkip: () => void; readonly goNext: () => void }) {
  if (step === STEPS.length - 1) return null
  const accent = STEP_ACCENTS[step]
  return (
    <footer className="mt-10 hidden items-center justify-between border-t border-[#F3F4F6] pt-10 md:flex">
      {step < STEPS.length - 1 ? (
        <button type="button" className="cursor-pointer font-body text-sm leading-[18px] text-[#9CA3AF]" onClick={goSkip}>
          Skip
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        className={[
          'flex h-[52px] w-[140px] cursor-pointer items-center justify-center rounded-xl font-body text-[15px] font-semibold leading-[18px] text-surface transition-colors duration-300 hover:brightness-110',
          accent.solid,
        ].join(' ')}
        onClick={goNext}
      >
        Next →
      </button>
    </footer>
  )
}

function MobileFooter({ step, goSkip, goNext }: { readonly step: number; readonly goSkip: () => void; readonly goNext: () => void }) {
  if (step === STEPS.length - 1) return null
  const accent = STEP_ACCENTS[step]
  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 flex h-[105px] items-start justify-between border-t border-[#F3F4F6] bg-surface/95 px-7 py-5 backdrop-blur-sm md:hidden">
      {step < STEPS.length - 1 ? (
        <button type="button" className="h-12 cursor-pointer font-body text-sm leading-[18px] text-[#9CA3AF]" onClick={goSkip}>
          Skip
        </button>
      ) : (
        <span />
      )}
      <button
        type="button"
        className={[
          'flex h-12 min-w-[120px] cursor-pointer items-center justify-center rounded-xl px-7 font-body text-[15px] font-semibold leading-[18px] text-surface transition-colors duration-300',
          accent.solid,
        ].join(' ')}
        onClick={goNext}
      >
        Next →
      </button>
    </footer>
  )
}
