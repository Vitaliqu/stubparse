"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { appCheckToken, clientAuth, clientDb, firebaseConfigured } from "@/lib/firebase/client";
import { summarize, type AccountDoc, type AccountSummary } from "@/lib/plan";
import { identify, resetAnalytics } from "@/lib/analytics";

interface AuthState {
  configured: boolean;
  user: User | null;
  loading: boolean;
  account: AccountSummary | null;
  /** fetch() with the user's ID token attached. */
  authedFetch: (input: string, init?: RequestInit) => Promise<Response>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(firebaseConfigured);
  const [account, setAccount] = useState<AccountSummary | null>(null);

  useEffect(() => {
    if (!firebaseConfigured) return;
    return onAuthStateChanged(clientAuth(), (u) => {
      setUser(u);
      if (u) identify(u.uid, { email: u.email ?? undefined });
      else { setAccount(null); resetAnalytics(); }
      setLoading(false);
    });
  }, []);

  const authedFetch = useCallback(async (input: string, init: RequestInit = {}) => {
    const current = firebaseConfigured ? clientAuth().currentUser : null;
    if (!current) throw new Error("Sign in to continue.");
    const [token, check] = await Promise.all([current.getIdToken(), appCheckToken()]);
    const headers = new Headers(init.headers);
    headers.set("Authorization", `Bearer ${token}`);
    if (check) headers.set("X-Firebase-AppCheck", check);
    return fetch(input, { ...init, headers });
  }, []);

  // Ensure the account exists, then follow it live so upgrades from the Stripe webhook appear instantly.
  useEffect(() => {
    if (!user) return;
    let unsub: (() => void) | undefined;
    let cancelled = false;
    authedFetch("/api/account")
      .then((r) => (r.ok ? r.json() : null))
      .then((summary: AccountSummary | null) => {
        if (cancelled) return;
        if (summary) setAccount(summary);
        unsub = onSnapshot(
          doc(clientDb(), "users", user.uid),
          (snap) => snap.exists() && setAccount(summarize(snap.data() as AccountDoc)),
          (err) => console.warn("[account] live updates unavailable", err.code),
        );
      })
      .catch(() => {});
    return () => { cancelled = true; unsub?.(); };
  }, [user, authedFetch]);

  const signOut = useCallback(async () => {
    if (firebaseConfigured) await fbSignOut(clientAuth());
  }, []);

  const value = useMemo<AuthState>(
    () => ({ configured: firebaseConfigured, user, loading, account, authedFetch, signOut }),
    [user, loading, account, authedFetch, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
