"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Check, KeyRound, Trash2, ExternalLink, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { usePrefs } from "@/lib/prefs";
import { redirectToStripe } from "@/lib/billing";
import { canUse, FREE_DOCUMENTS, RETENTION_OPTIONS, TIERS, type Interval, type PaidTier } from "@/lib/plan";
import { TeamPanel } from "@/components/app/TeamPanel";
import { track } from "@/lib/analytics";
import { Button, Segmented, Spinner, Switch } from "@/components/ui";

const PROVIDER_LABEL: Record<string, string> = {
  "google.com": "Google", "apple.com": "Apple", password: "Email and password", emailLink: "Email link",
};

const date = (unix: number | null | undefined) =>
  unix ? new Date(unix * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : null;

interface Invoice { id: string; number: string | null; created: number; amount: number; currency: string; status: string | null; url: string | null }
interface ApiKey { id: string; name: string; prefix: string; createdAt: number; lastUsedAt: number | null }

export default function AccountPage() {
  const router = useRouter();
  const { user, account, authedFetch, signOut } = useAuth();
  const [prefs, setPref] = usePrefs(user?.uid);
  const [busy, setBusy] = useState<null | string>(null);
  const [error, setError] = useState("");
  const [interval, setInterval] = useState<Interval>("year");
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);

  const plan = account?.plan ?? "free";
  const isPaid = plan !== "free";
  const sub = account?.subscription;
  const hasOwnSub = !!account && account.ownPlan !== "free";
  const viaTeam = isPaid && !hasOwnSub && !!account?.team;
  const allowance = account ? Math.max(FREE_DOCUMENTS, account.docsUsed + account.freeRemaining) : FREE_DOCUMENTS;

  useEffect(() => {
    // Re-check the subscription with Stripe whenever the account page opens, then load invoices.
    authedFetch("/api/stripe/sync", { method: "POST" })
      .catch(() => {})
      .finally(() => authedFetch("/api/stripe/invoices").then((r) => (r.ok ? r.json() : { invoices: [] })).then((j) => setInvoices(j.invoices ?? [])).catch(() => setInvoices([])));
  }, [authedFetch]);

  const go = async (route: "checkout" | "portal", choice?: { plan: PaidTier; interval: Interval }) => {
    setBusy(route + (choice?.plan ?? ""));
    setError("");
    try {
      await redirectToStripe(authedFetch, route, choice);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Billing is unavailable right now.");
      setBusy(null);
    }
  };

  const providers = (user?.providerData ?? []).map((p) => PROVIDER_LABEL[p.providerId] ?? p.providerId);
  const status = !account ? "Loading your plan…"
    : !isPaid ? `${account.freeRemaining} of ${allowance} free documents left.`
    : viaTeam ? `Included with ${account.team!.name}. The team owner manages billing.`
    : sub?.status === "past_due" ? "Your last payment didn't go through. Update your card to keep your plan."
    : sub?.cancelAtPeriodEnd ? `Cancelled. Your plan stays active until ${date(sub.currentPeriodEnd) ?? "the end of the period"}.`
    : `Renews ${date(sub?.currentPeriodEnd) ?? (sub?.interval === "year" ? "yearly" : "monthly")}.`;

  return (
    <div className="mx-auto max-w-[760px] px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="text-[32px] font-semibold tracking-[-0.03em]">Account</h1>

      {/* ── Plan ─────────────────────────────────────────────────────────── */}
      <Panel title="Plan">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[24px] font-semibold tracking-[-0.025em]">
              {account ? TIERS[plan].name : "—"}
              {hasOwnSub && sub && (
                <span className="tnum ml-2 text-[15px] font-normal text-muted">
                  ${sub.interval === "year" ? TIERS[plan].yearly : TIERS[plan].monthly}/{sub.interval === "year" ? "year" : "month"}
                </span>
              )}
            </p>
            <p className="mt-2 max-w-[46ch] text-[14px] leading-relaxed text-muted">{status}</p>
          </div>
          {hasOwnSub && (
            <Button variant="secondary" onClick={() => go("portal")} loading={busy === "portal"} disabled={!!busy}>Manage billing</Button>
          )}
        </div>

        {account && !isPaid && (
          <>
            <div className="border-t border-line px-6 py-4">
              <div className="flex gap-1.5" aria-hidden>
                {Array.from({ length: allowance }, (_, i) => (
                  <span key={i} className={`h-1.5 flex-1 rounded-full ${i < account.docsUsed ? "bg-ink" : "bg-line"}`} />
                ))}
              </div>
              <p className="tnum mt-2 text-[12px] text-muted">{Math.min(account.docsUsed, allowance)} of {allowance} used</p>
            </div>
            <div className="border-t border-line p-6">
              <div className="max-w-[16rem]">
                <Segmented label="Billing interval" value={interval} onChange={setInterval} options={[{ value: "month", label: "Monthly" }, { value: "year", label: <>Yearly <span className="text-ok">−17%</span></> }]} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {(["pro", "business"] as const).map((t) => (
                  <div key={t} className="flex flex-col rounded-[12px] p-4 ring-1 ring-line">
                    <p className="flex items-baseline justify-between gap-2">
                      <span className="text-[15px] font-semibold">{TIERS[t].name}</span>
                      <span className="tnum text-[14px] text-muted">${interval === "month" ? TIERS[t].monthly : TIERS[t].yearly}/{interval === "month" ? "mo" : "yr"}</span>
                    </p>
                    <p className="mt-1 flex-1 text-[13px] leading-relaxed text-muted">{TIERS[t].tagline}</p>
                    <Button className="mt-4" variant={t === "business" ? "primary" : "secondary"} onClick={() => go("checkout", { plan: t, interval })} loading={busy === `checkout${t}`} disabled={!!busy}>
                      Choose {TIERS[t].name}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        {account && isPaid && (
          <div className="tnum border-t border-line px-6 py-4 text-[13px] text-muted">
            {account.docsUsed.toLocaleString("en-US")} documents parsed in total.{hasOwnSub ? " Switch plans or cancel from Manage billing." : ""}
          </div>
        )}
        {error && <p role="alert" className="border-t border-line bg-bad-soft px-6 py-3 text-[13px] text-bad">{error}</p>}
      </Panel>

      {/* ── Invoices ─────────────────────────────────────────────────────── */}
      {(hasOwnSub || (invoices?.length ?? 0) > 0) && (
        <Panel title="Invoices">
          {invoices === null ? (
            <div className="flex items-center gap-2 px-6 py-5 text-[14px] text-muted"><Spinner /> Loading…</div>
          ) : invoices.length === 0 ? (
            <p className="px-6 py-5 text-[14px] text-muted">No invoices yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {invoices.map((inv) => (
                <li key={inv.id} className="tnum flex items-center gap-4 px-6 py-3 text-[14px]">
                  <span className="w-36 text-muted">{date(inv.created)}</span>
                  <span className="flex-1 font-mono">{(inv.amount / 100).toLocaleString("en-US", { style: "currency", currency: inv.currency.toUpperCase() })}</span>
                  <span className={`text-[12px] font-medium ${inv.status === "paid" ? "text-ok" : "text-muted"}`}>{inv.status}</span>
                  {inv.url && <a href={inv.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[13px] font-medium hover:underline">Receipt <ExternalLink aria-hidden className="size-3.5" strokeWidth={2} /></a>}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {/* ── Preferences ──────────────────────────────────────────────────── */}
      <Panel title="Preferences">
        <div className="flex items-start justify-between gap-6 px-6 py-5">
          <div>
            <p className="text-[14px] font-medium">Save results to history</p>
            <p className="mt-1 max-w-[50ch] text-[13px] leading-relaxed text-muted">
              Stores the extracted fields so you can reopen and re-export them. The files themselves are never saved. {isPaid ? "" : "Available on Pro and Business."}
            </p>
          </div>
          <Switch checked={isPaid && prefs.saveHistory} onChange={() => setPref({ saveHistory: !prefs.saveHistory })} label="Save results to history" disabled={!isPaid} />
        </div>
        <div className="flex items-start justify-between gap-6 border-t border-line px-6 py-5">
          <div>
            <label htmlFor="retention" className="text-[14px] font-medium">Delete saved stubs after</label>
            <p className="mt-1 max-w-[50ch] text-[13px] leading-relaxed text-muted">
              Saved stubs are deleted automatically when this period ends. Applies to stubs saved from now on.
            </p>
          </div>
          <select
            id="retention"
            value={prefs.retentionMonths}
            onChange={(e) => setPref({ retentionMonths: Number(e.target.value) })}
            disabled={!isPaid}
            className="h-9 shrink-0 rounded-[10px] bg-paper px-3 text-[14px] ring-1 ring-inset ring-line-2 outline-none focus:ring-2 focus:ring-ink disabled:opacity-50"
          >
            {RETENTION_OPTIONS.map((m) => <option key={m} value={m}>{m === 0 ? "Never" : m === 12 ? "1 year" : m === 24 ? "2 years" : `${m} months`}</option>)}
          </select>
        </div>
      </Panel>

      {/* ── Team ─────────────────────────────────────────────────────────── */}
      <TeamPanel />

      {/* ── API keys ─────────────────────────────────────────────────────── */}
      <ApiKeys enabled={canUse(plan, "api")} />

      {/* ── Profile ──────────────────────────────────────────────────────── */}
      <Panel title="Profile">
        <dl className="divide-y divide-line">
          <Row label="Email" value={user?.email ?? "—"} />
          <Row label="Sign-in method" value={providers.length ? providers.join(", ") : PROVIDER_LABEL.emailLink} />
          {user?.metadata.creationTime && <Row label="Member since" value={new Date(user.metadata.creationTime).toLocaleDateString("en-US", { month: "long", year: "numeric" })} />}
        </dl>
      </Panel>

      <div className="mt-6 flex justify-end">
        <Button variant="secondary" onClick={async () => { await signOut(); router.replace("/"); }}>Sign out</Button>
      </div>

      <DeleteAccount isPaid={isPaid} />
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  const id = `panel-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={id} className="mt-8">
      <h2 id={id} className="mb-2.5 text-[13px] font-medium text-muted">{title}</h2>
      <div className="overflow-hidden rounded-[14px] bg-paper ring-1 ring-line">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <dt className="text-[14px] text-muted">{label}</dt>
      <dd className="truncate text-[14px] font-medium">{value}</dd>
    </div>
  );
}

function ApiKeys({ enabled }: { enabled: boolean }) {
  const { authedFetch } = useAuth();
  const [keys, setKeys] = useState<ApiKey[] | null>(null);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    authedFetch("/api/keys").then((r) => r.json()).then((j) => setKeys(j.keys ?? [])).catch(() => setKeys([]));
  }, [authedFetch]);
  useEffect(() => { if (enabled) load(); }, [enabled, load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const res = await authedFetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Couldn't create the key.");
      setFresh(j.key); setName(""); setCopied(false); load();
      track("api_key_created");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't create the key.");
    } finally {
      setBusy(false);
    }
  };

  const revoke = async (k: ApiKey) => {
    if (!window.confirm(`Revoke "${k.name}"? Apps using it will stop working immediately.`)) return;
    await authedFetch(`/api/keys?id=${encodeURIComponent(k.id)}`, { method: "DELETE" });
    load();
  };

  return (
    <Panel title="API keys">
      {!enabled ? (
        <div className="flex items-center justify-between gap-4 px-6 py-5">
          <p className="flex items-center gap-2 text-[14px] text-muted"><Lock aria-hidden className="size-4" strokeWidth={1.75} />Parse stubs from your own software with the REST API.</p>
          <Link href="/pricing" className="shrink-0 text-[14px] font-medium hover:underline">Business plan</Link>
        </div>
      ) : (
        <>
          {fresh && (
            <div className="border-b border-line bg-mark-soft px-6 py-4">
              <p className="text-[13px] font-medium">Copy your new key now. You won&apos;t see it again.</p>
              <div className="mt-2 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-lg bg-paper px-3 py-2 font-mono text-[13px] ring-1 ring-line">{fresh}</code>
                <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(fresh); setCopied(true); }}>
                  {copied ? <Check className="size-3.5" strokeWidth={2.5} /> : <Copy className="size-3.5" strokeWidth={2} />}{copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          )}
          {keys === null ? (
            <div className="flex items-center gap-2 px-6 py-5 text-[14px] text-muted"><Spinner /> Loading…</div>
          ) : keys.length > 0 && (
            <ul className="divide-y divide-line">
              {keys.map((k) => (
                <li key={k.id} className="flex items-center gap-3 px-6 py-3">
                  <KeyRound aria-hidden className="size-4 shrink-0 text-muted" strokeWidth={1.75} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium">{k.name}</span>
                    <span className="tnum block font-mono text-[12px] text-muted">{k.prefix}… · {k.lastUsedAt ? `used ${new Date(k.lastUsedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "never used"}</span>
                  </span>
                  <button onClick={() => revoke(k)} aria-label={`Revoke ${k.name}`} className="cursor-pointer rounded-md p-1.5 text-muted hover:bg-bad-soft hover:text-bad"><Trash2 className="size-4" strokeWidth={1.75} /></button>
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={create} className="flex flex-wrap items-center gap-2 border-t border-line px-6 py-4">
            <label className="min-w-[200px] flex-1">
              <span className="sr-only">Key name</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Key name, e.g. Underwriting server" maxLength={60} className="h-9 w-full rounded-[10px] px-3 text-[14px] ring-1 ring-inset ring-line-2 outline-none placeholder:text-faint focus:ring-2 focus:ring-ink" />
            </label>
            <Button type="submit" size="sm" loading={busy}>Create key</Button>
            <Link href="/docs/api" className="text-[13px] text-muted hover:text-ink hover:underline">API reference</Link>
          </form>
          {error && <p role="alert" className="border-t border-line bg-bad-soft px-6 py-3 text-[13px] text-bad">{error}</p>}
        </>
      )}
    </Panel>
  );
}

function DeleteAccount({ isPaid }: { isPaid: boolean }) {
  const router = useRouter();
  const { authedFetch, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const remove = async () => {
    setBusy(true); setError("");
    try {
      const res = await authedFetch("/api/account", { method: "DELETE" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error ?? "Couldn't delete the account.");
      await signOut().catch(() => {});
      router.replace("/?deleted=1");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(/session expired/i.test(msg)
        ? "For security, sign out and sign back in, then delete your account."
        : msg || "Couldn't delete the account.");
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="danger-h" className="mt-12 border-t border-line pt-8">
      <h2 id="danger-h" className="text-[15px] font-semibold">Delete account</h2>
      <p className="mt-1 max-w-[56ch] text-[14px] leading-relaxed text-muted">
        Permanently deletes your account, saved history, and API keys{isPaid ? ", and cancels your subscription immediately with no refund for the current period" : ""}. Stripe keeps invoice records as required by law.
      </p>
      {!open ? (
        <Button variant="danger" className="mt-4" onClick={() => setOpen(true)}>Delete account…</Button>
      ) : (
        <div className="mt-4 max-w-md rounded-[14px] bg-paper p-5 ring-1 ring-line">
          <label htmlFor="confirm-delete" className="text-[13px] font-medium">Type <span className="font-mono">DELETE</span> to confirm</label>
          <input id="confirm-delete" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="off" className="mt-1.5 h-10 w-full rounded-[10px] px-3 font-mono text-[14px] ring-1 ring-inset ring-line-2 outline-none focus:ring-2 focus:ring-bad" />
          {error && <p role="alert" className="mt-2 text-[13px] text-bad">{error}</p>}
          <div className="mt-4 flex gap-2">
            <Button variant="danger" onClick={remove} loading={busy} disabled={confirm !== "DELETE"}>Delete permanently</Button>
            <Button variant="ghost" onClick={() => { setOpen(false); setConfirm(""); }}>Cancel</Button>
          </div>
        </div>
      )}
    </section>
  );
}
