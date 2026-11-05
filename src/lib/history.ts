"use client";

// Saved history: extracted data only (never the file).
// Personal: users/{uid}/documents/{id}. Team: teams/{teamId}/documents/{id} (shared by members).
// Firestore rules allow creating documents only on a paid plan; owners/members can always read and delete.

import {
  addDoc, collection, doc, documentId, getDocs, limit, onSnapshot, orderBy, query,
  serverTimestamp, Timestamp, updateDoc, where, writeBatch, type Unsubscribe,
} from "firebase/firestore";
import { clientDb } from "@/lib/firebase/client";
import type { PaystubData } from "@/types/paystub";
import type { FileSignals } from "@/lib/integrity";
import type { AccountSummary } from "@/lib/plan";

/** Where history lives for this account: the team's shared collection, or the user's own. */
type HistoryScope = { kind: "user"; uid: string } | { kind: "team"; teamId: string; uid: string };

export function historyScope(uid: string, account: AccountSummary | null): HistoryScope {
  return account?.team && account.team.tier === "business"
    ? { kind: "team", teamId: account.team.id, uid }
    : { kind: "user", uid };
}

export interface SavedDocument {
  id: string;
  fileName: string;
  fileType: "pdf" | "image";
  mode: "ai" | "basic";
  label: string;
  data: PaystubData;
  fileSignals: FileSignals | null;
  createdAt: number;       // ms
  expiresAt: number | null; // ms; null = kept until deleted
  createdByEmail: string | null;
}

const MAX_HISTORY = 1000;
const docsCol = (scope: HistoryScope) =>
  scope.kind === "team"
    ? collection(clientDb(), "teams", scope.teamId, "documents")
    : collection(clientDb(), "users", scope.uid, "documents");

const millis = (v: unknown) => (v as { toMillis?: () => number } | undefined)?.toMillis?.() ?? null;

function fromSnap(id: string, d: Record<string, unknown>): SavedDocument {
  return {
    id,
    fileName: String(d.fileName ?? ""),
    fileType: d.fileType === "image" ? "image" : "pdf",
    mode: d.mode === "basic" ? "basic" : "ai",
    label: String(d.label ?? ""),
    data: d.data as PaystubData,
    fileSignals: (d.fileSignals as FileSignals) ?? null,
    createdAt: millis(d.createdAt) ?? Date.now(),
    expiresAt: millis(d.expiresAt),
    createdByEmail: typeof d.createdByEmail === "string" ? d.createdByEmail : null,
  };
}

/** Expiry timestamp for a retention window in months (0 = keep). */
function expiryFor(months: number, from = new Date()): Timestamp | null {
  if (!months) return null;
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return Timestamp.fromDate(d);
}

export async function saveDocument(
  scope: HistoryScope,
  input: Omit<SavedDocument, "id" | "createdAt" | "expiresAt" | "createdByEmail">,
  opts: { retentionMonths: number; email: string | null },
): Promise<string> {
  const ref = await addDoc(docsCol(scope), {
    ...input,
    // Firestore rejects undefined; strip it from nested data
    data: JSON.parse(JSON.stringify(input.data)),
    fileSignals: input.fileSignals ? JSON.parse(JSON.stringify(input.fileSignals)) : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    expiresAt: expiryFor(opts.retentionMonths),
    createdBy: scope.uid,
    createdByEmail: opts.email,
  });
  return ref.id;
}

export async function updateDocument(scope: HistoryScope, id: string, patch: Partial<Pick<SavedDocument, "data" | "label">>) {
  await updateDoc(doc(docsCol(scope), id), {
    ...(patch.data ? { data: JSON.parse(JSON.stringify(patch.data)) } : {}),
    ...(patch.label !== undefined ? { label: patch.label } : {}),
    updatedAt: serverTimestamp(),
  });
}

export async function deleteDocuments(scope: HistoryScope, ids: string[]) {
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(clientDb());
    ids.slice(i, i + 400).forEach((id) => batch.delete(doc(docsCol(scope), id)));
    await batch.commit();
  }
}

/** Live history, newest first. Expired items are hidden even before the cleanup job removes them. */
export function watchHistory(scope: HistoryScope, cb: (docs: SavedDocument[]) => void, onError?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    query(docsCol(scope), orderBy("createdAt", "desc"), limit(MAX_HISTORY)),
    (snap) => {
      const now = Date.now();
      cb(snap.docs.map((d) => fromSnap(d.id, d.data())).filter((d) => !d.expiresAt || d.expiresAt > now));
    },
    (err) => onError?.(err),
  );
}

export async function loadDocuments(scope: HistoryScope, ids: string[]): Promise<SavedDocument[]> {
  const out: SavedDocument[] = [];
  for (let i = 0; i < ids.length; i += 30) {
    const snap = await getDocs(query(docsCol(scope), where(documentId(), "in", ids.slice(i, i + 30))));
    snap.docs.forEach((d) => out.push(fromSnap(d.id, d.data())));
  }
  return ids.map((id) => out.find((d) => d.id === id)).filter((d): d is SavedDocument => !!d);
}
