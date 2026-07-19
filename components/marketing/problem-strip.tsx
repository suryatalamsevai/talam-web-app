export function ProblemStrip() {
  return (
    <section className="relative bg-bg py-24 md:min-h-[72vh] md:flex md:items-center overflow-hidden">
      <div className="relative grid w-full max-w-[1100px] mx-auto gap-14 px-6 md:grid-cols-2 md:gap-10 md:px-[60px]">
        <div className="marketing-reveal min-w-0 text-center md:text-left">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-warm font-body mb-4">Today</div>
          <p className="font-marketing font-medium text-fg text-[28px] sm:text-[32px] md:text-[52px] leading-[1.15] tracking-[-0.01em] break-words">
            Screenshots, DMs,<br />
            UPI requests, <span className="text-danger">lost orders</span>.
          </p>
        </div>
        <div className="marketing-reveal min-w-0 text-center md:text-left [animation-delay:160ms]">
          <div className="text-xs uppercase tracking-[0.2em] text-muted-warm font-body mb-4">Tomorrow</div>
          <p className="font-marketing font-medium text-fg text-[28px] sm:text-[32px] md:text-[52px] leading-[1.15] tracking-[-0.01em] break-words">
            <span className="text-brand-primary">yourstore</span>.talam4shop.com
          </p>
          <p className="mt-4 text-base text-muted-warm font-body">One link. Every order in one place.</p>
        </div>
      </div>
    </section>
  )
}
