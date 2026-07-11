import { Upload } from 'lucide-react'

import { BRAND_COLORS, type BrandColor } from './onboarding-data'
import { StepTitle } from './onboarding-fields'

export function BrandStep({
  brandColor,
  setBrandColor,
}: {
  readonly brandColor: BrandColor
  readonly setBrandColor: (value: BrandColor) => void
}) {
  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <StepTitle
        step={2}
        title="Brand your store"
        description="Add a logo and choose the primary action color used across your storefront."
      />
      <div className="space-y-5">
        <div className="flex min-h-[148px] flex-col items-center justify-center rounded-lg border-[1.5px] border-dashed border-border bg-surface px-4 py-8 text-center transition-colors hover:border-brand-primary hover:bg-brand-primary/5">
          <Upload className="size-8 text-muted-warm" strokeWidth={1.8} />
          <p className="mt-3 text-md font-bold text-fg">Upload logo</p>
          <p className="mt-1 text-xs text-muted-warm">PNG or JPG, square works best</p>
        </div>
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-[0.04em] text-fg">Primary color</p>
          <div className="flex flex-wrap gap-2">
            {BRAND_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                className={[
                  'size-10 rounded-full border transition-transform',
                  color === brandColor ? 'scale-110 border-[3px] border-fg' : 'border-border',
                ].join(' ')}
                style={{ backgroundColor: color }}
                onClick={() => setBrandColor(color)}
                aria-label={`Use ${color}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <span className="size-9 rounded-md border border-border" style={{ backgroundColor: brandColor }} />
            <input
              value={brandColor}
              readOnly
              className="min-h-9 flex-1 rounded-lg border border-border bg-surface px-3 font-mono text-sm font-semibold uppercase tracking-[0.04em] text-fg"
            />
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <div className="flex h-10 items-center gap-2 bg-bg-dark px-3">
            <span className="size-2 rounded-full bg-border-light" />
            <span className="size-2 rounded-full bg-border-light" />
            <span className="size-2 rounded-full bg-border-light" />
          </div>
          <div className="flex gap-3 p-4">
            <div className="size-14 rounded-lg bg-bg" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-fg">Silk kurta set</p>
              <p className="mt-1 text-xs text-muted-warm">₹1,850</p>
              <button type="button" className="mt-3 rounded-lg px-4 py-2 text-sm font-bold text-surface" style={{ backgroundColor: brandColor }}>
                Add to cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
