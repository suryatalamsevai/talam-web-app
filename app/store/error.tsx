'use client'

export default function StoreError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center min-h-screen px-4">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-muted-foreground text-sm">
          We couldn&apos;t load the store. Please try again.
        </p>
      </div>
      <button
        onClick={reset}
        className="mt-4 rounded-lg border border-border bg-surface px-4 py-2 font-body text-sm font-semibold text-fg hover:bg-bg"
      >
        Try again
      </button>
    </main>
  )
}
