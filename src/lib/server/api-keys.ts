// API keys for the Business REST API. Only a SHA-256 hash is stored; the key is shown once.

import { createHash, randomBytes } from "crypto";
import { adminDb } from "@/lib/firebase/admin";
import { HttpError } from "@/lib/server/account";

interface ApiKeyRecord {
  id: string;          // the hash (safe to expose; it can't be reversed into the key)
  name: string;
  prefix: string;      // first characters, for recognizing a key in the list
  createdAt: number;
  lastUsedAt: number | null;
}

const col = () => adminDb().collection("apiKeys");
const hash = (key: string) => createHash("sha256").update(key).digest("hex");
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

const MAX_KEYS = 10;

function newKey(): string {
  const bytes = randomBytes(32);
  let s = "";
  for (const b of bytes) s += BASE62[b % 62];
  return `sp_live_${s}`;
}

export async function createApiKey(uid: string, name: string): Promise<{ key: string; record: ApiKeyRecord }> {
  const existing = await col().where("uid", "==", uid).count().get();
  if (existing.data().count >= MAX_KEYS) throw new HttpError(400, `You can have up to ${MAX_KEYS} keys. Revoke one first.`, "too_many_keys");
  const key = newKey();
  const id = hash(key);
  const record = { name: name.trim().slice(0, 60) || "Untitled key", prefix: key.slice(0, 12), createdAt: Date.now(), lastUsedAt: null };
  await col().doc(id).set({ uid, ...record });
  return { key, record: { id, ...record } };
}

export async function listApiKeys(uid: string): Promise<ApiKeyRecord[]> {
  const snap = await col().where("uid", "==", uid).get();
  return snap.docs
    .map((d) => {
      const v = d.data();
      return { id: d.id, name: v.name, prefix: v.prefix, createdAt: v.createdAt, lastUsedAt: v.lastUsedAt ?? null };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function revokeApiKey(uid: string, id: string) {
  const ref = col().doc(id);
  const snap = await ref.get();
  if (!snap.exists || snap.data()?.uid !== uid) throw new HttpError(404, "Key not found.", "not_found");
  await ref.delete();
}

export async function deleteAllApiKeys(uid: string) {
  const snap = await col().where("uid", "==", uid).get();
  const batch = adminDb().batch();
  snap.docs.forEach((d) => batch.delete(d.ref));
  if (!snap.empty) await batch.commit();
}

/** Resolves `Authorization: Bearer sp_live_...` to its owner. */
export async function authenticateApiKey(req: Request): Promise<{ uid: string; keyId: string }> {
  const header = req.headers.get("authorization") ?? "";
  const key = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!key.startsWith("sp_live_")) throw new HttpError(401, "Missing or malformed API key. Send Authorization: Bearer sp_live_...", "invalid_key");
  const id = hash(key);
  const snap = await col().doc(id).get();
  if (!snap.exists) throw new HttpError(401, "This API key is invalid or was revoked.", "invalid_key");
  snap.ref.update({ lastUsedAt: Date.now() }).catch(() => {});
  return { uid: snap.data()!.uid as string, keyId: id };
}
