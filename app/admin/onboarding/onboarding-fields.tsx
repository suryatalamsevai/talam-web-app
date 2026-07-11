import { ChevronDown } from 'lucide-react'

export function StepTitle({
  step,
  title,
  description,
  mobileTitle,
  mobileDescription,
}: {
  readonly step: number
  readonly title: string
  readonly description: string
  readonly mobileTitle?: string
  readonly mobileDescription?: string
}) {
  return (
    <div className="mb-11 animate-[fadeIn_0.2s_ease-out] md:mb-11">
      <p className="font-body text-xs font-medium uppercase leading-tight tracking-[0.08em] text-brand-primary">Step {step} of 5</p>
      <h1 className="mt-2.5 font-heading text-[32px] font-bold leading-[36px] tracking-[-0.02em] text-[#1F2937] md:text-[36px] md:leading-[44px]">
        {mobileTitle ? <span className="md:hidden">{mobileTitle}</span> : null}
        <span className={mobileTitle ? 'hidden md:inline' : undefined}>{title}</span>
      </h1>
      <p className="mt-2 font-body text-base leading-6 text-[#6B7280]">
        {mobileDescription ? <span className="md:hidden">{mobileDescription}</span> : null}
        <span className={mobileDescription ? 'hidden md:inline' : undefined}>{description}</span>
      </p>
    </div>
  )
}

export function Field({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-2">
      <span className="font-body text-sm font-medium leading-[18px] text-[#374151]">{label}</span>
      {children}
    </label>
  )
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="h-14 rounded-xl border border-[#E5E7EB] bg-surface px-5 font-body text-base leading-5 text-[#1F2937] outline-none transition-colors placeholder:text-[#9CA3AF] focus:border-2 focus:border-brand-primary focus:shadow-[0_0_0_4px_#4F3FF014]"
    />
  )
}

export function SelectField({
  children,
  defaultValue,
}: {
  readonly children: React.ReactNode
  readonly defaultValue?: string
}) {
  return (
    <span className="relative">
      <select
        className="h-[52px] w-full appearance-none rounded-xl border border-[#E5E7EB] bg-surface px-5 pr-12 font-body text-base leading-5 text-[#1F2937] outline-none focus:border-brand-primary"
        defaultValue={defaultValue}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute right-5 top-1/2 size-4 -translate-y-1/2 text-[#6B7280]" />
    </span>
  )
}

export function FieldHint({ children }: { readonly children: React.ReactNode }) {
  return <span className="mt-[-6px] font-body text-[13px] leading-tight text-[#6B7280]">{children}</span>
}
