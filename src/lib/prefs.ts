"use client";

// Per-user preferences at users/{uid}/settings/prefs (client-writable).

import { useEffect, useState } from "react";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
import { DEFAULT_RETENTION_MONTHS } from "@/lib/plan";

interface Prefs {
  saveHistory: boolean;
  /** Months to keep saved stubs (0 = until deleted). Applies to stubs saved from now on. */
  retentionMonths: number;
}

const DEFAULTS: Prefs = { saveHistory: true, retentionMonths: DEFAULT_RETENTION_MONTHS };

export function usePrefs(uid: string | undefined): [Prefs, (patch: Partial<Prefs>) => Promise<void>] {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      doc(clientDb(), "users", uid, "settings", "prefs"),
      (snap) => setPrefs({ ...DEFAULTS, ...(snap.data() as Partial<Prefs> | undefined) }),
      () => {},
    );
  }, [uid]);

  const update = async (patch: Partial<Prefs>) => {
    if (!uid) return;
    setPrefs((p) => ({ ...p, ...patch }));
    await setDoc(doc(clientDb(), "users", uid, "settings", "prefs"), patch, { merge: true });
  };

  return [prefs, update];
}
