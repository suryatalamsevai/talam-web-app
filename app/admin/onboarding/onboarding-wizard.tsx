'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

import {
  completeOnboarding,
  saveBrandStep,
  saveContactStep,
  savePaymentStep,
  saveProductStep,
  saveStoreStep,
  saveStoryStep,
} from './actions'
import { BrandStep } from './brand-step'
import { ContactStep } from './contact-step'
import { GoLiveStep } from './go-live-step'
import { LaunchOverlay } from './launch-overlay'
import { STEP_ACCENTS, STEPS, type BrandColor, type PaymentId } from './onboarding-data'
import { PaymentStep } from './payment-step'
import { ProductStep } from './product-step'
import { StoreStep } from './store-step'
import { StoryStep } from './story-step'

type InitialTenant = {
  name: string
  slug: string
  storeType: string | null
  brandColor: string | null
  contactPhone: string | null
  contactEmail: string | null
  tagline: string | null
  paymentProvider: string
  onboardingStep: number
  about: { description: string | null } | null
} | null

type InitialBranch = { name: string; address: string | null; city: string | null } | null
type InitialProduct = { name: string; price: unknown; stockBySize: unknown } | null

function firstStockValue(stockBySize: unknown): string {
  if (!stockBySize || typeof stockBySize !== 'object') return ''
  const values = Object.values(stockBySize as Record<string, number>)
  return values.length > 0 ? String(values[0]) : ''
}

const PAYMENT_ID_BY_PROVIDER: Record<string, PaymentId> = {
  upi_manual: 'upi',
  razorpay: 'razorpay',
  instamojo: 'instamojo',
}

export function OnboardingWizard({
  initialTenant,
  initialBranch,
  initialProduct,
}: {
  readonly initialTenant: InitialTenant
  readonly initialBranch: InitialBranch
  readonly initialProduct: InitialProduct
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isLaunching, setIsLaunching] = useState(false)
  const [step, setStep] = useState(initialTenant?.onboardingStep ?? 0)
  const [storeName, setStoreName] = useState(initialTenant?.name ?? "Priya's Boutique")
  const [category, setCategory] = useState(initialTenant?.storeType ?? 'Clothing')
  const [brandColor, setBrandColor] = useState<BrandColor>((initialTenant?.brandColor as BrandColor) ?? '#4F3FF0')
  const [brandLogo, setBrandLogo] = useState<File | null>(null)
  const [contactPhone, setContactPhone] = useState(initialTenant?.contactPhone ?? '')
  const [contactEmail, setContactEmail] = useState(initialTenant?.contactEmail ?? '')
  const [branchName, setBranchName] = useState(initialBranch?.name ?? '')
  const [branchAddress, setBranchAddress] = useState(initialBranch?.address ?? '')
  const [branchCity, setBranchCity] = useState(initialBranch?.city ?? '')
  const [tagline, setTagline] = useState(initialTenant?.tagline ?? '')
  const [aboutDescription, setAboutDescription] = useState(initialTenant?.about?.description ?? '')
  const [productName, setProductName] = useState(initialProduct?.name ?? '')
  const [productPrice, setProductPrice] = useState(initialProduct ? String(initialProduct.price) : '')
  const [productStock, setProductStock] = useState(firstStockValue(initialProduct?.stockBySize))
  const [productPhoto, setProductPhoto] = useState<File | null>(null)
  const [paymentId, setPaymentId] = useState<PaymentId>(PAYMENT_ID_BY_PROVIDER[initialTenant?.paymentProvider ?? 'upi_manual'] ?? 'upi')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)

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
    if (current === 1) {
      const stepErrors: Record<string, string> = {}
      if (!brandLogo) stepErrors.brandLogo = 'Upload a store logo'
      return stepErrors
    }
    if (current === 2) {
      const stepErrors: Record<string, string> = {}
      if (!contactPhone.trim()) stepErrors.contactPhone = 'Phone number is required'
      if (!contactEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) stepErrors.contactEmail = 'Enter a valid email'
      if (!branchName.trim()) stepErrors.branchName = 'Store name is required'
      if (!branchAddress.trim()) stepErrors.branchAddress = 'Address is required'
      if (!branchCity.trim()) stepErrors.branchCity = 'City is required'
      return stepErrors
    }
    if (current === 3) {
      const stepErrors: Record<string, string> = {}
      if (!tagline.trim()) stepErrors.tagline = 'Tagline is required'
      if (!aboutDescription.trim()) stepErrors.aboutDescription = 'Tell customers your story'
      return stepErrors
    }
    if (current === 4) {
      const stepErrors: Record<string, string> = {}
      if (!productName.trim()) stepErrors.productName = 'Product name is required'
      if (!productPrice.trim() || Number(productPrice) <= 0) stepErrors.productPrice = 'Enter a valid price'
      if (!productStock.trim() || Number(productStock) < 0) stepErrors.productStock = 'Enter a valid stock quantity'
      if (!productPhoto) stepErrors.productPhoto = 'Upload a product photo'
      return stepErrors
    }
    return {}
  }

  async function runStepAction(current: number): Promise<{ error?: string }> {
    if (current === 0) return saveStoreStep({ storeName, slug, category })
    if (current === 1) return saveBrandStep({ brandColor })
    if (current === 2) return saveContactStep({ contactPhone, contactEmail, branchName, branchAddress, branchCity })
    if (current === 3) return saveStoryStep({ tagline, aboutDescription })
    if (current === 4) return saveProductStep({ productName, productPrice, productStock })
    if (current === 5) return savePaymentStep({ paymentId })
    return {}
  }

  function goNext() {
    const stepErrors = validateStep(step)
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors)
      return
    }
    setErrors({})
    setServerError(null)
    startTransition(async () => {
      try {
        const result = await runStepAction(step)
        if (result.error) {
          setServerError(result.error)
          return
        }
        setStep((current) => Math.min(current + 1, STEPS.length - 1))
      } catch {
        setServerError('Something went wrong — try again.')
      }
    })
  }

  function goBack() {
    setErrors({})
    setServerError(null)
    setStep((current) => Math.max(current - 1, 0))
  }

  function goLive() {
    setIsLaunching(true)
    startTransition(async () => {
      try {
        const [result] = await Promise.all([completeOnboarding(), new Promise((resolve) => setTimeout(resolve, 1200))])
        if (result.error || !result.storeUrl) {
          setServerError(result.error ?? 'Something went wrong — try again.')
          setIsLaunching(false)
          return
        }
        router.push(result.storeUrl)
      } catch {
        setServerError('Something went wrong — try again.')
        setIsLaunching(false)
      }
    })
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-surface font-body text-fg">
      {isLaunching ? <LaunchOverlay /> : null}
      <BackgroundWash step={step} />
      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-[560px] flex-col px-6 pb-32 pt-9 md:pb-16 md:pt-14">
        <ProgressHeader step={step} />
        <section className="relative mt-7 flex-1 rounded-3xl border border-white/70 bg-surface/90 p-7 shadow-[0_24px_70px_-20px_rgba(31,41,55,0.25)] backdrop-blur-sm md:p-11">
          <BackNav step={step} goBack={goBack} />
          {serverError ? <p className="mb-4 font-body text-sm font-medium text-danger">{serverError}</p> : null}
          {step === 0 ? (
            <StoreStep slug={slug} storeName={storeName} setStoreName={setStoreName} category={category} setCategory={setCategory} errors={errors} />
          ) : null}
          {step === 1 ? (
            <BrandStep brandColor={brandColor} setBrandColor={setBrandColor} brandLogo={brandLogo} setBrandLogo={setBrandLogo} errors={errors} />
          ) : null}
          {step === 2 ? (
            <ContactStep
              contactPhone={contactPhone}
              setContactPhone={setContactPhone}
              contactEmail={contactEmail}
              setContactEmail={setContactEmail}
              branchName={branchName}
              setBranchName={setBranchName}
              branchAddress={branchAddress}
              setBranchAddress={setBranchAddress}
              branchCity={branchCity}
              setBranchCity={setBranchCity}
              errors={errors}
            />
          ) : null}
          {step === 3 ? (
            <StoryStep
              tagline={tagline}
              setTagline={setTagline}
              aboutDescription={aboutDescription}
              setAboutDescription={setAboutDescription}
              errors={errors}
            />
          ) : null}
          {step === 4 ? (
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
          {step === 5 ? <PaymentStep paymentId={paymentId} setPaymentId={setPaymentId} /> : null}
          {step === 6 ? <GoLiveStep onGoLive={goLive} isPending={isPending} /> : null}
          <DesktopFooter step={step} goNext={goNext} isPending={isPending} />
        </section>
      </div>
      <MobileFooter step={step} goNext={goNext} isPending={isPending} />
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
  if (step === 0 || step === STEPS.length - 1) return null

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

function DesktopFooter({ step, goNext, isPending }: { readonly step: number; readonly goNext: () => void; readonly isPending: boolean }) {
  if (step === STEPS.length - 1) return null
  const accent = STEP_ACCENTS[step]
  return (
    <footer className="mt-10 hidden items-center justify-end border-t border-[#F3F4F6] pt-10 md:flex">
      <button
        type="button"
        disabled={isPending}
        className={[
          'flex h-[52px] w-[140px] cursor-pointer items-center justify-center rounded-xl font-body text-[15px] font-semibold leading-[18px] text-surface transition-colors duration-300 hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60',
          accent.solid,
        ].join(' ')}
        onClick={goNext}
      >
        {isPending ? 'Saving…' : 'Next →'}
      </button>
    </footer>
  )
}

function MobileFooter({ step, goNext, isPending }: { readonly step: number; readonly goNext: () => void; readonly isPending: boolean }) {
  if (step === STEPS.length - 1) return null
  const accent = STEP_ACCENTS[step]
  return (
    <footer className="fixed inset-x-0 bottom-0 z-30 flex h-[105px] items-center justify-end border-t border-[#F3F4F6] bg-surface/95 px-7 py-5 backdrop-blur-sm md:hidden">
      <button
        type="button"
        disabled={isPending}
        className={[
          'flex h-12 min-w-[120px] cursor-pointer items-center justify-center rounded-xl px-7 font-body text-[15px] font-semibold leading-[18px] text-surface transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-60',
          accent.solid,
        ].join(' ')}
        onClick={goNext}
      >
        {isPending ? 'Saving…' : 'Next →'}
      </button>
    </footer>
  )
}
