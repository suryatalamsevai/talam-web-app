export default function StoreLoading() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center min-h-screen" aria-busy="true" aria-live="polite">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-fg" />
    </main>
  )
}
