// Rate-limit in-memory MVP (spec §17).
// Límite por IP+ruta con ventana fija. Para producción multi-instancia usar Upstash Redis.
// No usar para datos críticos, solo anti-spam/anti-scrape en API pública.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): { ok: boolean; retryAfterSec: number; remaining: number } {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || cur.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0, remaining: limit - 1 };
  }
  if (cur.count < limit) {
    cur.count += 1;
    return { ok: true, retryAfterSec: 0, remaining: limit - cur.count };
  }
  return { ok: false, retryAfterSec: Math.ceil((cur.resetAt - now) / 1000), remaining: 0 };
}

/** Limpieza periódica para no crecer sin cota (llamar de vez en cuando). */
export function pruneRateLimit() {
  const now = Date.now();
  for (const [k, v] of buckets) {
    if (v.resetAt <= now) buckets.delete(k);
  }
  if (buckets.size > 5000) {
    const keys = [...buckets.keys()].slice(0, 1000);
    for (const k of keys) buckets.delete(k);
  }
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

// Límites MVP
export const LIMITS = {
  availability: { limit: 60, windowMs: 60_000 },
  createAppointment: { limit: 10, windowMs: 60_000 },
} as const;
