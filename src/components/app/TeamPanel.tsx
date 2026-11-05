"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Copy, Check, Lock, UserMinus, Users, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { canUse, TEAM_SEATS } from "@/lib/plan";
import { Button, Spinner } from "@/components/ui";

interface TeamView {
  id: string;
  name: string;
  role: "owner" | "member";
  tier: string;
  seats: number;
  members: { uid: string; email: string | null; role: "owner" | "member"; joinedAt: number }[];
  invites: { id: string; email: string; createdAt: number; expiresAt: number }[];
}

/** Account → Team: create a team, invite by email, manage seats, or leave. */
export function TeamPanel() {
  const { user, account, authedFetch } = useAuth();
  const [team, setTeam] = useState<TeamView | null | undefined>(undefined);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<{ url: string; emailed: boolean; to: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const ownBusiness = account?.ownPlan === "business";
  const inTeam = !!account?.team;
  const enabled = canUse(account?.plan, "team");

  const call = useCallback(async (input: string, init?: RequestInit) => {
    const res = await authedFetch(input, init);
    const j = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(j.error ?? "Something went wrong. Try again.");
    return j;
  }, [authedFetch]);

  useEffect(() => {
    if (!enabled && !inTeam) return; // the locked view renders without loading anything
    call("/api/team").then((j) => setTeam(j.team)).catch(() => setTeam(null));
  }, [enabled, inTeam, call]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setError("");
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "Something went wrong."); } finally { setBusy(null); }
  };

  const json = (body: unknown): RequestInit => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

  const create = (e: React.FormEvent) => { e.preventDefault(); run("create", async () => setTeam((await call("/api/team", json({ name }))).team)); };
  const invite = (e: React.FormEvent) => {
    e.preventDefault();
    run("invite", async () => {
      const j = await call("/api/team/invites", json({ email }));
      setTeam(j.team); setLink({ url: j.link, emailed: j.emailed, to: email.trim() }); setEmail(""); setCopied(false);
    });
  };
  const revoke = (id: string) => run(`revoke-${id}`, async () => setTeam((await call(`/api/team/invites?id=${encodeURIComponent(id)}`, { method: "DELETE" })).team));
  const remove = (uid: string, who: string) => {
    if (!window.confirm(`Remove ${who} from the team? They lose Business features and access to the shared history.`)) return;
    run(`remove-${uid}`, async () => setTeam((await call(`/api/team/members?uid=${encodeURIComponent(uid)}`, { method: "DELETE" })).team));
  };
  const leave = () => {
    if (!window.confirm("Leave the team? You'll lose the Business plan and the shared history.")) return;
    run("leave", async () => { await call("/api/team/members", { method: "DELETE" }); setTeam(null); });
  };
  const destroy = () => {
    if (!window.confirm("Delete the team? Every member loses access, and the team's shared history is deleted permanently.")) return;
    run("delete", async () => { await call("/api/team", { method: "DELETE" }); setTeam(null); });
  };

  return (
    <section aria-labelledby="panel-team" className="mt-8">
      <h2 id="panel-team" className="mb-2.5 text-[13px] font-medium text-muted">Team</h2>
      <div className="overflow-hidden rounded-[14px] bg-paper ring-1 ring-line">
        {!enabled && !inTeam ? (
          <div className="flex items-center justify-between gap-4 px-6 py-5">
            <p className="flex items-center gap-2 text-[14px] text-muted"><Lock aria-hidden className="size-4" strokeWidth={1.75} />Invite up to {TEAM_SEATS - 1} colleagues to share Business and one history.</p>
            <Link href="/pricing" className="shrink-0 text-[14px] font-medium hover:underline">Business plan</Link>
          </div>
        ) : team === undefined ? (
          <div className="flex items-center gap-2 px-6 py-5 text-[14px] text-muted"><Spinner /> Loading…</div>
        ) : team === null ? (
          ownBusiness ? (
            <form onSubmit={create} className="px-6 py-5">
              <p className="text-[14px] font-medium">Create a team</p>
              <p className="mt-1 text-[13px] text-muted">Business includes {TEAM_SEATS} seats, you plus {TEAM_SEATS - 1}. Members get Business features and a shared history.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <label className="min-w-[200px] flex-1">
                  <span className="sr-only">Team name</span>
                  <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Team name, e.g. Harbor Lending" maxLength={80} className="h-9 w-full rounded-[10px] px-3 text-[14px] ring-1 ring-inset ring-line-2 outline-none placeholder:text-faint focus:ring-2 focus:ring-ink" />
                </label>
                <Button type="submit" size="sm" loading={busy === "create"}>Create team</Button>
              </div>
            </form>
          ) : (
            <p className="px-6 py-5 text-[14px] text-muted">Your Business plan comes from a team, but the team couldn&apos;t be loaded. Refresh to try again.</p>
          )
        ) : (
          <>
            <div className="flex items-center gap-3 px-6 py-4">
              <span className="flex size-9 items-center justify-center rounded-[10px] bg-canvas"><Users aria-hidden className="size-4" strokeWidth={1.75} /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-semibold tracking-[-0.01em]">{team.name}</p>
                <p className="tnum text-[13px] text-muted">
                  {team.role === "owner" ? `${team.members.length + team.invites.length} of ${team.seats} seats used` : "You're a member"}
                  {team.tier !== "business" && " · Business is inactive; the owner's subscription lapsed"}
                </p>
              </div>
            </div>

            <ul className="divide-y divide-line border-t border-line">
              {team.members.map((m) => (
                <li key={m.uid} className="flex items-center gap-3 px-6 py-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-white">{(m.email ?? "?").charAt(0).toUpperCase()}</span>
                  <span className="min-w-0 flex-1 truncate text-[14px]">{m.email ?? "Unknown"}{m.uid === user?.uid && <span className="text-muted"> (you)</span>}</span>
                  <span className="text-[12px] text-muted capitalize">{m.role}</span>
                  {team.role === "owner" && m.role !== "owner" && (
                    <button onClick={() => remove(m.uid, m.email ?? "this member")} disabled={!!busy} aria-label={`Remove ${m.email}`} className="cursor-pointer rounded-md p-1.5 text-muted hover:bg-bad-soft hover:text-bad disabled:cursor-not-allowed">
                      {busy === `remove-${m.uid}` ? <Spinner /> : <UserMinus className="size-4" strokeWidth={1.75} />}
                    </button>
                  )}
                </li>
              ))}
              {team.invites.map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-6 py-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full ring-1 ring-dashed ring-line-2 text-[12px] text-muted">{i.email.charAt(0).toUpperCase()}</span>
                  <span className="min-w-0 flex-1 truncate text-[14px] text-muted">{i.email}</span>
                  <span className="text-[12px] text-muted">Invited</span>
                  <button onClick={() => revoke(i.id)} disabled={!!busy} aria-label={`Revoke invite for ${i.email}`} className="cursor-pointer rounded-md p-1.5 text-muted hover:bg-canvas hover:text-ink disabled:cursor-not-allowed">
                    {busy === `revoke-${i.id}` ? <Spinner /> : <X className="size-4" strokeWidth={1.75} />}
                  </button>
                </li>
              ))}
            </ul>

            {link && (
              <div className="border-t border-line bg-canvas/70 px-6 py-4">
                <p className="text-[13px] font-medium">{link.emailed ? `Invite sent to ${link.to}.` : `Send this link to ${link.to}.`} It works once, for that address, for 14 days.</p>
                <div className="mt-2 flex items-center gap-2">
                  <code className="min-w-0 flex-1 truncate rounded-lg bg-paper px-3 py-2 font-mono text-[12px] ring-1 ring-line">{link.url}</code>
                  <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard.writeText(link.url); setCopied(true); }}>
                    {copied ? <Check className="size-3.5" strokeWidth={2.5} /> : <Copy className="size-3.5" strokeWidth={2} />}{copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
            )}

            {team.role === "owner" ? (
              <>
                <form onSubmit={invite} className="flex flex-wrap items-center gap-2 border-t border-line px-6 py-4">
                  <label className="min-w-[200px] flex-1">
                    <span className="sr-only">Email to invite</span>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="colleague@company.com" className="h-9 w-full rounded-[10px] px-3 text-[14px] ring-1 ring-inset ring-line-2 outline-none placeholder:text-faint focus:ring-2 focus:ring-ink" />
                  </label>
                  <Button type="submit" size="sm" loading={busy === "invite"} disabled={!email.trim() || team.members.length + team.invites.length >= team.seats}>Invite</Button>
                </form>
                <div className="flex justify-end border-t border-line px-6 py-3">
                  <button onClick={destroy} disabled={!!busy} className="cursor-pointer text-[13px] text-muted hover:text-bad disabled:cursor-not-allowed">Delete team</button>
                </div>
              </>
            ) : (
              <div className="flex justify-end border-t border-line px-6 py-3">
                <Button variant="ghost" size="sm" onClick={leave} loading={busy === "leave"}>Leave team</Button>
              </div>
            )}
          </>
        )}
        {error && <p role="alert" className="border-t border-line bg-bad-soft px-6 py-3 text-[13px] text-bad">{error}</p>}
      </div>
    </section>
  );
}
