"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isSignInWithEmailLink, signInWithEmailLink } from "firebase/auth";
import { clientAuth } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth-context";
import { Button, Spinner } from "@/components/ui";
import { authErrorMessage, EMAIL_FOR_LINK_KEY, safeNext } from "./auth-helpers";
import { NotConfigured } from "./NotConfigured";

/** Finishes a magic-link sign-in. Asks for the email when the link is opened on a different device. */
export function CompleteEmailLink() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const { configured } = useAuth();
  const [state, setState] = useState<"working" | "need-email" | "invalid" | "error">("working");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const started = useRef(false);

  const finish = async (address: string) => {
    setState("working");
    try {
      await signInWithEmailLink(clientAuth(), address, window.location.href);
      window.localStorage.removeItem(EMAIL_FOR_LINK_KEY);
      router.replace(next);
    } catch (e) {
      setError(authErrorMessage(e));
      setState("error");
    }
  };

  useEffect(() => {
    if (!configured || started.current) return;
    started.current = true;
    const href = window.location.href;
    // Decide after the first paint (Firebase reads the URL; localStorage holds the email from this device)
    queueMicrotask(() => {
      if (!isSignInWithEmailLink(clientAuth(), href)) return setState("invalid");
      const saved = window.localStorage.getItem(EMAIL_FOR_LINK_KEY);
      if (saved) finish(saved);
      else setState("need-email");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [configured]);

  if (!configured) return <NotConfigured />;

  return (
    <div className="rounded-[22px] bg-paper p-8 shadow-[var(--shadow-float)] ring-1 ring-line">
      {state === "working" && (
        <div className="flex items-center gap-3 text-[15px]"><Spinner /> Signing you in…</div>
      )}
      {state === "need-email" && (
        <form onSubmit={(e) => { e.preventDefault(); if (email.trim()) finish(email.trim()); }}>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em]">Confirm your email</h1>
          <p className="mt-2 text-[15px] text-muted">You opened this link on a different device. Enter the email you used to request it.</p>
          <label htmlFor="confirm-email" className="mt-6 block text-[13px] font-medium">Email</label>
          <input
            id="confirm-email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)}
            className="mt-1.5 h-11 w-full rounded-[10px] px-3.5 text-[15px] ring-1 ring-inset ring-line-2 outline-none focus:ring-2 focus:ring-ink"
          />
          <Button type="submit" size="lg" className="mt-4 w-full" disabled={!email.trim()}>Continue</Button>
        </form>
      )}
      {(state === "invalid" || state === "error") && (
        <>
          <h1 className="text-[24px] font-semibold tracking-[-0.025em]">This link can&apos;t be used</h1>
          <p className="mt-2 text-[15px] text-muted">{state === "error" ? error : "It's incomplete or not a sign-in link. Request a new one."}</p>
          <Link href="/sign-in" className="mt-6 inline-block text-[14px] font-medium underline underline-offset-4">Back to sign in</Link>
        </>
      )}
    </div>
  );
}
