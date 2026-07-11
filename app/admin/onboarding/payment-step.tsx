import { PAYMENTS, type PaymentId } from './onboarding-data'
import { StepTitle } from './onboarding-fields'

export function PaymentStep({
  paymentId,
  setPaymentId,
}: {
  readonly paymentId: PaymentId
  readonly setPaymentId: (value: PaymentId) => void
}) {
  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <StepTitle
        step={4}
        title="Connect payments"
        description="Pick how customers pay you. You can change this anytime from settings."
      />
      <div className="space-y-[10px]">
        {PAYMENTS.map((payment) => {
          const selected = payment.id === paymentId

          return (
            <label
              key={payment.id}
              className={[
                'block rounded-xl border-[1.5px] bg-surface p-4 transition-colors',
                selected ? 'border-brand-primary bg-brand-primary/5' : 'border-border',
              ].join(' ')}
            >
              <span className="flex items-start gap-3">
                <input
                  className="mt-1 size-5 accent-brand-primary"
                  type="radio"
                  name="payment"
                  checked={selected}
                  onChange={() => setPaymentId(payment.id)}
                />
                <span className={`flex h-7 w-10 items-center justify-center rounded-[5px] text-[10px] font-bold ${payment.markClassName}`}>
                  {payment.mark}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-bold text-fg">{payment.name}</span>
                  <span className="mt-1 block text-xs leading-snug text-muted-warm">{payment.description}</span>
                </span>
              </span>
              {selected ? (
                <span className="mt-4 block rounded-lg border border-border bg-surface p-3 text-xs leading-relaxed text-muted-warm">
                  Setup fields will connect in the data pass. This UI keeps the payment choice visible and editable.
                </span>
              ) : null}
            </label>
          )
        })}
      </div>
    </div>
  )
}
