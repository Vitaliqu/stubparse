export function NotConfigured() {
  return (
    <div className="rounded-[22px] bg-paper p-8 ring-1 ring-line">
      <h1 className="text-[24px] font-semibold tracking-[-0.025em]">Accounts aren&apos;t set up yet</h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted">
        This deployment has no Firebase configuration. Add the <code className="font-mono text-[13px] text-ink">NEXT_PUBLIC_FIREBASE_*</code> variables
        from <code className="font-mono text-[13px] text-ink">.env.example</code> and redeploy.
      </p>
    </div>
  );
}
