"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GoogleAuthProvider, OAuthProvider, signInWithPopup,
  signInWithEmailAndPassword, createUserWithEmailAndPassword,
  sendSignInLinkToEmail, sendPasswordResetEmail, getAdditionalUserInfo, sendEmailVerification, type UserCredential,
} from "firebase/auth";
import { track } from "@/lib/analytics";
import { MailCheck } from "lucide-react";
import { clientAuth } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui";
import { FREE_DOCUMENTS } from "@/lib/plan";
import { authErrorMessage, EMAIL_FOR_LINK_KEY, safeNext } from "./auth-helpers";
import { NotConfigured } from "./NotConfigured";

type Mode = "sign-in" | "sign-up";
type Pending = null | "google" | "apple" | "password" | "link" | "reset";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const { user, loading, configured } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<Pending>(null);
  const [error, setError] = useState("");
  const [sent, setSent] = useState<null | "link" | "reset">(null);

  useEffect(() => {
    if (!loading && user) router.replace(next);
  }, [user, loading, next, router]);

  if (!configured) return <NotConfigured />;

  const run = async (kind: Exclude<Pending, null>, fn: () => Promise<unknown>) => {
    setPending(kind);
    setError("");
    try {
      await fn();
    } catch (e) {
      const msg = authErrorMessage(e);
      if (msg) setError(msg);
    } finally {
      setPending(null);
    }
  };

  const oauth = (kind: "google" | "apple") =>
    run(kind, () => {
      const provider = kind === "google" ? new GoogleAuthProvider() : new OAuthProvider("apple.com");
      if (kind === "apple") (provider as OAuthProvider).addScope("email");
      return signInWithPopup(clientAuth(), provider).then(trackCredential(kind));
    });

  const submitPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError("Enter your email address.");
    if (mode === "sign-up" && password.length < 8) return setError("Choose a password with at least 8 characters.");
    if (!password) return setError("Enter your password, or use a sign-in link instead.");
    run("password", () =>
      (mode === "sign-up"
        ? createUserWithEmailAndPassword(clientAuth(), email.trim(), password).then((cred) => {
            // Verified email is required for team invites and admin access
            sendEmailVerification(cred.user).catch(() => {});
            return cred;
          })
        : signInWithEmailAndPassword(clientAuth(), email.trim(), password)).then(trackCredential("password")),
    );
  };

  const sendLink = () => {
    if (!email.trim()) return setError("Enter your email first, and we'll send the link there.");
    run("link", async () => {
      const url = `${window.location.origin}/sign-in/complete?next=${encodeURIComponent(next)}`;
      await sendSignInLinkToEmail(clientAuth(), email.trim(), { url, handleCodeInApp: true });
      window.localStorage.setItem(EMAIL_FOR_LINK_KEY, email.trim());
      setSent("link");
    });
  };

  const resetPassword = () => {
    if (!email.trim()) return setError("Enter your email first, and we'll send the reset link there.");
    run("reset", async () => {
      await sendPasswordResetEmail(clientAuth(), email.trim());
      setSent("reset");
    });
  };

  if (sent) {
    return (
      <div className="rounded-[22px] bg-paper p-8 text-center shadow-[var(--shadow-float)] ring-1 ring-line">
        <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-canvas">
          <MailCheck aria-hidden className="size-6" strokeWidth={1.75} />
        </span>
        <h1 className="mt-5 text-[24px] font-semibold tracking-[-0.025em]">Check your email</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          {sent === "link" ? "We sent a sign-in link to " : "We sent a password reset link to "}
          <span className="font-medium text-ink">{email}</span>.
          {sent === "link" ? " Open it on this device to finish signing in." : " Follow it, then come back to sign in."}
        </p>
        <Button variant="secondary" className="mt-6 w-full" onClick={() => setSent(null)}>Use a different email</Button>
      </div>
    );
  }

  const busy = pending !== null;
  const title = mode === "sign-up" ? "Create your account" : "Sign in to StubParse";
  const switchHref = `${mode === "sign-up" ? "/sign-in" : "/sign-up"}${next !== "/app" ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <div className="rounded-[22px] bg-paper p-7 shadow-[var(--shadow-float)] ring-1 ring-line sm:p-8">
      <h1 className="text-[24px] leading-tight font-semibold tracking-[-0.03em]">{title}</h1>
      <p className="mt-2 text-[15px] text-muted">
        {mode === "sign-up" ? `${FREE_DOCUMENTS} documents free. No card required.` : "Welcome back."}
      </p>

      <div className="mt-7 grid gap-2.5">
        <Button variant="secondary" size="lg" onClick={() => oauth("google")} loading={pending === "google"} disabled={busy}>
          {pending !== "google" && <GoogleLogo />} Continue with Google
        </Button>
        <Button variant="secondary" size="lg" onClick={() => oauth("apple")} loading={pending === "apple"} disabled={busy}>
          {pending !== "apple" && <AppleLogo />} Continue with Apple
        </Button>
      </div>

      <div className="my-6 flex items-center gap-3 text-[12px] text-muted" role="separator">
        <span className="h-px flex-1 bg-line" /> or use email <span className="h-px flex-1 bg-line" />
      </div>

      <form onSubmit={submitPassword} className="grid gap-3" noValidate>
        <Field label="Email" type="email" autoComplete="email" value={email} onChange={setEmail} />
        <Field
          label={mode === "sign-up" ? "Create a password" : "Password"}
          type="password"
          autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
          value={password}
          onChange={setPassword}
          hint={mode === "sign-up" ? "At least 8 characters." : undefined}
          aside={mode === "sign-in" ? (
            <button type="button" onClick={resetPassword} disabled={busy} className="cursor-pointer text-[13px] text-muted hover:text-ink disabled:cursor-not-allowed">
              Forgot password?
            </button>
          ) : undefined}
        />

        {error && <p role="alert" className="rounded-[10px] bg-bad-soft px-3 py-2.5 text-[13px] leading-snug text-bad">{error}</p>}

        <Button type="submit" size="lg" className="mt-1" loading={pending === "password"} disabled={busy}>
          {mode === "sign-up" ? "Create account" : "Sign in"}
        </Button>
        <Button type="button" variant="ghost" onClick={sendLink} loading={pending === "link"} disabled={busy}>
          Email me a sign-in link instead
        </Button>
      </form>

      <p className="mt-6 text-center text-[14px] text-muted">
        {mode === "sign-up" ? "Already have an account? " : "New to StubParse? "}
        <Link href={switchHref} className="font-medium text-ink underline-offset-4 hover:underline">
          {mode === "sign-up" ? "Sign in" : "Create an account"}
        </Link>
      </p>
      {mode === "sign-up" && (
        <p className="mt-4 text-center text-[12px] leading-relaxed text-muted">
          By continuing you agree to the <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.
        </p>
      )}
    </div>
  );
}

function Field({
  label, type, autoComplete, value, onChange, hint, aside,
}: {
  label: string; type: string; autoComplete: string; value: string; onChange: (v: string) => void; hint?: string; aside?: React.ReactNode;
}) {
  const id = `f-${label.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <label htmlFor={id} className="text-[13px] font-medium">{label}</label>
        {aside}
      </div>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="h-11 w-full rounded-[10px] bg-paper px-3.5 text-[15px] ring-1 ring-inset ring-line-2 transition-shadow outline-none placeholder:text-faint focus:ring-2 focus:ring-ink"
      />
      {hint && <p id={`${id}-hint`} className="mt-1.5 text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden fill="currentColor">
      <path d="M16.37 12.6c-.02-2.3 1.88-3.4 1.96-3.45-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.47.83-.72 0-1.82-.81-3-.79-1.54.02-2.96.9-3.76 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.1 1.67 2.34 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.38 0 1.77.74 2.98.72 1.23-.02 2.01-1.12 2.76-2.23.87-1.28 1.23-2.52 1.25-2.58-.03-.01-2.4-.92-2.42-3.66zM14.1 5.86c.63-.77 1.06-1.83.94-2.89-.91.04-2.01.61-2.66 1.37-.58.67-1.09 1.75-.96 2.79 1.02.08 2.05-.52 2.68-1.27z" />
    </svg>
  );
}

const trackCredential = (method: string) => (cred: UserCredential) => {
  track(getAdditionalUserInfo(cred)?.isNewUser ? "signed_up" : "signed_in", { method });
  return cred;
};
