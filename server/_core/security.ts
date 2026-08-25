import type { RequestHandler } from "express";

export const productionSecurityHeaders = {
  "Content-Security-Policy": "base-uri 'self'; object-src 'none'; form-action 'self'",
  "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
} as const;

export type RequestQuota = { allowed: boolean; remaining: number; resetAt: number };
type RateLimitBucket = { count: number; resetAt: number };

export function consumeRequestQuota(buckets: Map<string, RateLimitBucket>, key: string, now: number, limit: number, windowMs: number): RequestQuota {
  const current = buckets.get(key);
  const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
  bucket.count += 1;
  buckets.set(key, bucket);
  return { allowed: bucket.count <= limit, remaining: Math.max(0, limit - bucket.count), resetAt: bucket.resetAt };
}

export function createApiRateLimitMiddleware({ limit = 240, windowMs = 60_000, now = () => Date.now() }: { limit?: number; windowMs?: number; now?: () => number } = {}): RequestHandler {
  const buckets = new Map<string, RateLimitBucket>();
  return (req, res, next) => {
    const currentTime = now();
    if (buckets.size > 5_000) {
      for (const [key, bucket] of Array.from(buckets.entries())) {
        if (bucket.resetAt <= currentTime) buckets.delete(key);
      }
    }
    const key = req.ip || req.socket.remoteAddress || "unknown";
    const quota = consumeRequestQuota(buckets, key, currentTime, limit, windowMs);
    res.setHeader("RateLimit-Limit", String(limit));
    res.setHeader("RateLimit-Remaining", String(quota.remaining));
    res.setHeader("RateLimit-Reset", String(Math.ceil(quota.resetAt / 1000)));
    if (!quota.allowed) {
      res.status(429).json({ error: "تم تجاوز حد الطلبات مؤقتاً. أعد المحاولة بعد قليل." });
      return;
    }
    next();
  };
}

export const applySecurityHeaders: RequestHandler = (_req, res, next) => {
  for (const [name, value] of Object.entries(productionSecurityHeaders)) res.setHeader(name, value);
  next();
};
