const tags = ["Racing thoughts", "Too hot", "Caffeine late", "Work worry"];

/** A pure-CSS phone showing The 4am Journal. No images, so it loads instantly. */
export function PhoneMock() {
  return (
    <div
      aria-hidden
      className="relative mx-auto w-[260px] rounded-[2.5rem] border border-line bg-[#070a12] p-3 shadow-[0_0_80px_-20px_rgba(139,124,246,0.45)]"
    >
      <div className="rounded-[2rem] bg-card px-5 pb-6 pt-8">
        <p className="text-center font-mono text-4xl tracking-tight text-foreground/90">4:07</p>
        <p className="mt-1 text-center text-xs text-muted">AM · Journal</p>
        <div className="mt-6 rounded-2xl border border-line bg-background/60 p-4 text-sm leading-relaxed text-muted">
          Can&apos;t stop replaying tomorrow&apos;s meeting. Room feels warm…
          <span className="ml-0.5 inline-block h-4 w-px translate-y-0.5 animate-pulse bg-accent" />
        </div>
        <p className="mt-5 text-xs text-muted">What&apos;s keeping you up?</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {tags.map((t, i) => (
            <span
              key={t}
              className={`rounded-full px-3 py-1 text-xs ${
                i < 2 ? "bg-accent-2/25 text-foreground" : "border border-line text-muted"
              }`}
            >
              {t}
            </span>
          ))}
        </div>
        <p className="mt-5 flex items-center gap-1.5 text-[11px] text-muted">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Stays on your phone
        </p>
      </div>
    </div>
  );
}
