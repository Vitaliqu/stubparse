// Rate limiting. Uses Upstash Redis when configured (shared across all instances);
// otherwise falls back to a per-instance in-memory window, which is fine for development.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Limiter = (key: string) => Promise<{ ok: boolean; retryAfter: number }>;

const upstash = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? Redis.fromEnv()
  : null;

function memoryLimiter(limit: number, windowMs: number): Limiter {
  const hits = new Map<string, number[]>();
  return async (key) => {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 10_000) for (const [k, v] of hits) if (!v.some((t) => now - t < windowMs)) hits.delete(k);
    const ok = recent.length <= limit;
    return { ok, retryAfter: ok ? 0 : Math.ceil((windowMs - (now - recent[0])) / 1000) };
  };
}

function makeLimiter(name: string, limit: number, windowSeconds: number): Limiter {
  if (!upstash) return memoryLimiter(limit, windowSeconds * 1000);
  const rl = new Ratelimit({ redis: upstash, limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`), prefix: `rl:${name}` });
  return async (key) => {
    const res = await rl.limit(key);
    return { ok: res.success, retryAfter: res.success ? 0 : Math.max(1, Math.ceil((res.reset - Date.now()) / 1000)) };
  };
}

/** AI extraction from the app: 30 per minute per user. */
export const aiParseLimit = makeLimiter("ai", 30, 60);
/** Public API: 60 per minute per key. */
export const apiLimit = makeLimiter("api", 60, 60);
/** Unauthenticated export generation: 30 per minute per IP. */
export const exportLimit = makeLimiter("export", 30, 60);

if (!upstash && process.env.VERCEL_ENV === "production") {
  console.warn("[ratelimit] UPSTASH_REDIS_REST_URL/TOKEN not set: rate limits are per instance. Daily and monthly plan caps still apply.");
}

/** Basic-mode metering calls: 120 per minute per user. */
export const consumeLimit = makeLimiter("consume", 120, 60);
