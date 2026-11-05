export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <article className="mx-auto max-w-[680px] px-4 py-20 sm:px-6 sm:py-28">
      <h1 className="text-[clamp(2.5rem,6vw,3.75rem)] leading-[1.02] font-semibold tracking-[-0.035em]">{title}</h1>
      <p className="mt-4 text-[14px] text-muted">Last updated {updated}</p>
      <div className="mt-12 space-y-5 text-[16px] leading-[1.7] text-ink-2 [&_a]:underline [&_h2]:pt-6 [&_h2]:text-[24px] [&_h2]:font-semibold [&_h2]:tracking-[-0.02em] [&_h2]:text-ink [&_li]:pl-1 [&_strong]:font-semibold [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
        {children}
      </div>
    </article>
  );
}
