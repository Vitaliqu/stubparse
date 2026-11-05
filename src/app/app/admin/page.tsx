"use client";

import { useEffect, useState } from "react";
import { Search, ExternalLink, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { TIERS, type AccountDoc, type AccountSummary } from "@/lib/plan";
import { Button, Spinner } from "@/components/ui";

interface Report {
  auth: { uid: string; email: string | null; emailVerified: boolean; disabled: boolean; providers: string[]; createdAt: string; lastSignInAt: string };
  account: AccountDoc | null;
  summary: AccountSummary;
  stripeDashboard: string | null;
  counts: { apiKeys: number; savedStubs: number; historyScope: string };
  errors: { where: string | null; message: string; at: number }[];
  adminLog: { admin: string; action: string; detail: Record<string, unknown>; at: number }[];
}

const when = (ms: number | string | undefined | null) =>
  ms ? new Date(ms).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";

export default function AdminPage() {
  const { authedFetch } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [q, setQ] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [grant, setGrant] = useState("3");

  useEffect(() => {
    authedFetch("/api/admin/me").then((r) => r.json()).then((j) => setAllowed(!!j.admin)).catch(() => setAllowed(false));
  }, [authedFetch]);

  const call = async (key: string, input: string, init?: RequestInit) => {
    setBusy(key); setError("");
    try {
      const res = await authedFetch(input, init);
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Request failed.");
      setReport(j);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setBusy(null);
    }
  };

  const search = (e: React.FormEvent) => { e.preventDefault(); if (q.trim()) call("search", `/api/admin/users?q=${encodeURIComponent(q.trim())}`); };
  const act = (action: string, extra: Record<string, unknown> = {}) => {
    if (!report) return;
    if (action === "disable" && !window.confirm(`Disable sign-in for ${report.auth.email}? They'll be signed out everywhere.`)) return;
    call(action, "/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid: report.auth.uid, action, ...extra }) });
  };

  if (allowed === null) return <div className="flex justify-center py-24 text-muted"><Spinner className="size-5" /></div>;
  if (!allowed) {
    return (
      <div className="mx-auto max-w-[480px] px-4 py-24 text-center">
        <ShieldAlert aria-hidden className="mx-auto size-8 text-muted" strokeWidth={1.5} />
        <h1 className="mt-4 text-[24px] font-semibold tracking-[-0.025em]">Admins only</h1>
        <p className="mt-2 text-[15px] text-muted">Your account isn&apos;t on the admin list.</p>
      </div>
    );
  }

  const a = report?.account;
  const s = report?.summary;

  return (
    <div className="mx-auto max-w-[1000px] px-4 py-10 sm:px-6">
      <h1 className="text-[32px] font-semibold tracking-[-0.03em]">Admin</h1>
      <form onSubmit={search} className="mt-6 flex gap-2">
        <label className="relative flex-1">
          <span className="sr-only">Find a user</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-faint" strokeWidth={2} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Email, user ID, or Stripe customer ID (cus_…)" className="h-10 w-full rounded-[10px] bg-paper pr-3 pl-9 text-[14px] ring-1 ring-inset ring-line-2 outline-none placeholder:text-faint focus:ring-2 focus:ring-ink" />
        </label>
        <Button type="submit" loading={busy === "search"}>Look up</Button>
      </form>
      {error && <p role="alert" className="mt-4 rounded-[10px] bg-bad-soft px-4 py-3 text-[14px] text-bad">{error}</p>}

      {report && s && (
        <div className="mt-8 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <Card title="Identity">
              <Rows rows={[
                ["Email", `${report.auth.email ?? "—"}${report.auth.emailVerified ? "" : " (unverified)"}`],
                ["User ID", report.auth.uid],
                ["Sign-in", report.auth.providers.join(", ") || "email link"],
                ["Created", when(report.auth.createdAt)],
                ["Last sign-in", when(report.auth.lastSignInAt)],
                ["Status", report.auth.disabled ? "Disabled" : "Active"],
              ]} />
            </Card>
            <Card title="Plan and usage">
              <Rows rows={[
                ["Effective plan", TIERS[s.plan].name + (s.ownPlan !== s.plan ? ` (via team ${s.team?.name})` : "")],
                ["Own subscription", a?.subscription ? `${a.subscription.tier} · ${a.subscription.interval} · ${a.subscription.status}${a.subscription.cancelAtPeriodEnd ? " · cancels at period end" : ""}` : "None"],
                ["Documents (lifetime)", String(a?.docsUsed ?? 0)],
                ["This month", `${a?.periodUsed ?? 0} (${a?.periodKey ?? "—"})`],
                ["Bonus documents", String(a?.bonusDocs ?? 0)],
                ["Free remaining", s.plan === "free" ? String(s.freeRemaining) : "—"],
                ["Team", a?.team ? `${a.team.name} · ${a.team.role} · ${a.team.tier}` : "None"],
                ["Saved stubs", `${report.counts.savedStubs} (${report.counts.historyScope})`],
                ["API keys", String(report.counts.apiKeys)],
                ["Emails", a?.emailOptOut ? "Opted out" : Object.keys(a?.emails ?? {}).join(", ") || "None sent"],
              ]} />
              {report.stripeDashboard && (
                <a href={report.stripeDashboard} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 border-t border-line px-5 py-3 text-[13px] font-medium hover:underline">Open in Stripe <ExternalLink aria-hidden className="size-3.5" strokeWidth={2} /></a>
              )}
            </Card>
            <Card title={`Recent errors (${report.errors.length})`}>
              {report.errors.length === 0 ? <p className="px-5 py-4 text-[14px] text-muted">No errors in the last 30 days.</p> : (
                <ul className="divide-y divide-line">
                  {report.errors.map((e, i) => (
                    <li key={i} className="px-5 py-3 text-[13px]">
                      <p className="flex justify-between gap-4"><span className="font-mono">{e.where ?? "unknown"}</span><span className="text-muted">{when(e.at)}</span></p>
                      <p className="mt-1 text-muted">{e.message}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <div className="space-y-4">
            <Card title="Support actions">
              <div className="space-y-3 p-5">
                <div className="flex gap-2">
                  <label className="flex-1">
                    <span className="sr-only">Documents to grant</span>
                    <input type="number" value={grant} onChange={(e) => setGrant(e.target.value)} min={-100} max={1000} className="h-9 w-full rounded-[10px] px-3 font-mono text-[14px] ring-1 ring-inset ring-line-2 outline-none focus:ring-2 focus:ring-ink" />
                  </label>
                  <Button size="sm" onClick={() => act("grant_docs", { amount: Number(grant) })} loading={busy === "grant_docs"}>Grant documents</Button>
                </div>
                <Button variant="secondary" className="w-full" onClick={() => act("reset_month")} loading={busy === "reset_month"}>Reset this month&apos;s usage</Button>
                <Button variant="secondary" className="w-full" onClick={() => act("sync_billing")} loading={busy === "sync_billing"} disabled={!a?.stripeCustomerId}>Re-sync with Stripe</Button>
                {report.auth.disabled
                  ? <Button variant="secondary" className="w-full" onClick={() => act("enable")} loading={busy === "enable"}>Enable sign-in</Button>
                  : <Button variant="danger" className="w-full" onClick={() => act("disable")} loading={busy === "disable"}>Disable sign-in</Button>}
              </div>
            </Card>
            <Card title="Audit log">
              {report.adminLog.length === 0 ? <p className="px-5 py-4 text-[14px] text-muted">No admin actions yet.</p> : (
                <ul className="divide-y divide-line">
                  {report.adminLog.map((l, i) => (
                    <li key={i} className="px-5 py-3 text-[13px]">
                      <p className="font-medium">{l.action.replace(/_/g, " ")}{l.detail && Object.keys(l.detail).length ? <span className="font-mono font-normal text-muted"> {JSON.stringify(l.detail)}</span> : null}</p>
                      <p className="text-muted">{l.admin} · {when(l.at)}</p>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[14px] bg-paper ring-1 ring-line">
      <h2 className="border-b border-line px-5 py-3 text-[13px] font-semibold">{title}</h2>
      {children}
    </section>
  );
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="divide-y divide-line">
      {rows.map(([k, v]) => (
        <div key={k} className="flex flex-col gap-0.5 px-5 py-2.5 sm:flex-row sm:justify-between sm:gap-6">
          <dt className="text-[13px] text-muted">{k}</dt>
          <dd className="tnum truncate text-[13px] font-medium sm:text-right">{v}</dd>
        </div>
      ))}
    </dl>
  );
}
