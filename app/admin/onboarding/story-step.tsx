import { Field, FieldHint, StepTitle, TextArea, TextInput } from './onboarding-fields'

export function StoryStep({
  tagline,
  setTagline,
  aboutDescription,
  setAboutDescription,
  errors,
}: {
  readonly tagline: string
  readonly setTagline: (value: string) => void
  readonly aboutDescription: string
  readonly setAboutDescription: (value: string) => void
  readonly errors: Record<string, string>
}) {
  return (
    <div className="animate-[fadeIn_0.2s_ease-out]">
      <StepTitle step={4} title="Your story" description="Tell customers who you are and why they should buy from you." />
      <div className="flex flex-col gap-6">
        <Field label="Tagline" error={errors.tagline}>
          <FieldHint>A short line shown near your store name</FieldHint>
          <TextInput value={tagline} onChange={(event) => setTagline(event.target.value)} invalid={Boolean(errors.tagline)} />
        </Field>
        <Field label="About your store" error={errors.aboutDescription}>
          <FieldHint>Shown on your About page</FieldHint>
          <TextArea
            value={aboutDescription}
            onChange={(event) => setAboutDescription(event.target.value)}
            invalid={Boolean(errors.aboutDescription)}
          />
        </Field>
      </div>
    </div>
  )
}
