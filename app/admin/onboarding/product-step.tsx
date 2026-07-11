import { ImagePlus } from 'lucide-react'

import { SIZES } from './onboarding-data'
import { Field, SelectField, StepTitle, TextInput } from './onboarding-fields'

export function ProductStep() {
  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <StepTitle
        step={3}
        title="Add your first product"
        description="Create one product now so your store has something real to show."
      />
      <div className="space-y-5">
        <Field label="Product name">
          <TextInput defaultValue="Handwoven silk kurta" />
        </Field>
        <Field label="Price">
          <TextInput defaultValue="1850" inputMode="numeric" />
        </Field>
        <Field label="Category">
          <SelectField>
            <option>Kurtis</option>
            <option>Sarees</option>
            <option>Crafts</option>
          </SelectField>
        </Field>
        <div className="flex min-h-[132px] flex-col items-center justify-center rounded-lg border-[1.5px] border-dashed border-border bg-surface px-4 py-6 text-center">
          <ImagePlus className="size-8 text-muted-warm" strokeWidth={1.8} />
          <p className="mt-3 text-md font-bold text-fg">Upload product image</p>
          <p className="mt-1 text-xs text-muted-warm">Customers buy what they can inspect</p>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.04em] text-fg">Sizes</p>
          <div className="flex flex-wrap gap-2">
            {SIZES.map((size, index) => (
              <label
                key={size}
                className={[
                  'rounded-lg border-[1.5px] px-[14px] py-2 text-sm font-bold',
                  index < 4 ? 'border-brand-primary bg-brand-primary/5 text-brand-primary' : 'border-border text-muted-warm',
                ].join(' ')}
              >
                <input className="sr-only" type="checkbox" defaultChecked={index < 4} />
                {size}
              </label>
            ))}
          </div>
        </div>
        <button type="button" className="min-h-11 text-sm font-medium text-muted-warm">
          I&apos;ll add categories later
        </button>
      </div>
    </div>
  )
}
