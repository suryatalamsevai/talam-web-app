export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center min-h-screen">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-semibold">Store not found</h1>
        <p className="text-muted-foreground text-sm">
          This store doesn&apos;t exist or may have moved.
        </p>
      </div>
    </main>
  )
}
