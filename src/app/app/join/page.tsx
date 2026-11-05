"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users } from "lucide-react";
import { sendEmailVerification } from "firebase/auth";
import { useAuth } from "@/lib/auth-context";
import { Button, ButtonLink, Spinner } from "@/components/ui";

export default function JoinPage() {
  return <Suspense><Join /></Suspense>;
}

function Join() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, authedFetch, signOut } = useAuth();
  const [unverified, setUnverified] = useState(false);
  const [sent, setSent] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<"working" | "done" | "error">("working");
  const [message, setMessage] = useState("");
  const [teamName, setTeamName] = useState("");
  const started = useRef(false);
  const team = params.get("team"), token = params.get("token");
  const incomplete = !team || !token;

  useEffect(() => {
    if (started.current || !user || incomplete) return;
    started.current = true;
    const retry = attempt > 0;
    authedFetch("/api/team/join", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ team, token }) })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (j.code === "email_unverified") { setUnverified(true); started.current = false; throw new Error(j.error); }
        if (!r.ok) throw new Error(j.error ?? "Couldn't accept the invite.");
        setTeamName(j.membership?.name ?? "the team");
        setState("done");
      })
      .catch((e) => { setState("error"); setMessage(e instanceof Error ? e.message : "Couldn't accept the invite."); });
    void retry;
  }, [user, team, token, incomplete, authedFetch, attempt]);

  const resend = async () => { if (user) { await sendEmailVerification(user).catch(() => {}); setSent(true); } };
  const recheck = async () => {
    if (!user) return;
    await user.reload();
    await user.getIdToken(true); // pick up the verified flag
    setUnverified(false); setState("working"); setAttempt((n) => n + 1);
  };

  const view = incomplete ? "error" : state;
  const text = incomplete ? "This invite link is incomplete. Ask the team owner to send it again." : message;

  return (
    <div className="mx-auto max-w-[480px] px-4 py-16 sm:py-24">
      <div className="rounded-[22px] bg-paper p-8 text-center shadow-[var(--shadow-float)] ring-1 ring-line">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-canvas"><Users aria-hidden className="size-6" strokeWidth={1.75} /></span>
        {view === "working" && <p className="mt-5 flex items-center justify-center gap-2 text-[15px] text-muted"><Spinner /> Joining the team…</p>}
        {view === "done" && (
          <>
            <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.025em]">You&apos;re in {teamName}</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">You now have the Business plan, and stubs you parse go to the team&apos;s shared history.</p>
            <div className="mt-6 flex justify-center gap-2">
              <ButtonLink href="/app">Open workspace</ButtonLink>
              <ButtonLink href="/app/history" variant="secondary">Team history</ButtonLink>
            </div>
          </>
        )}
        {view === "error" && (
          <>
            <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.025em]">This invite didn&apos;t work</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{text}</p>
            {unverified && (
              <div className="mt-6 flex flex-col items-center gap-2">
                <div className="flex gap-2">
                  <Button onClick={recheck}>I&apos;ve verified it</Button>
                  <Button variant="secondary" onClick={resend} disabled={sent}>{sent ? "Email sent" : "Send verification email"}</Button>
                </div>
                <p className="text-[13px] text-muted">Open the link in the email, then come back here.</p>
              </div>
            )}
            <div className="mt-6 flex justify-center gap-2">
              {/sign in with/i.test(text) && (
                <Button variant="secondary" onClick={async () => { await signOut(); router.replace(`/sign-in?next=${encodeURIComponent(`/app/join?${params.toString()}`)}`); }}>Switch account</Button>
              )}
              <ButtonLink href="/app">Go to workspace</ButtonLink>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
