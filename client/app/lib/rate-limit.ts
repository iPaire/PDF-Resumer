// lib/rate-limit.ts - Distributed rate limiting via @upstash/ratelimit.
//
// Algorithm: token bucket. Each key (user id or IP) has a bucket of
// `maxTokens` that refills at `refillRate` per `interval`. This allows a
// legitimate burst (a student uploading 3 chapters back-to-back) while
// still capping sustained throughput - unlike a fixed window, which either
// blocks the burst or allows 2x the limit across a window boundary.
//
// State lives in Upstash Redis so limits are shared across all Vercel
// serverless instances. Falls back to a per-instance in-memory bucket when
// Redis is not configured (dev) - better than nothing, but not distributed.
//
// @upstash/ratelimit was already a dependency but never wired up; API routes
// previously had no request-level rate limiting at all (only monthly quotas).
import { Ratelimit } from '@upstash/ratelimit';
import type { NextRequest } from 'next/server';
import { getRedis } from './redis';

export type RateLimitName = 'ai' | 'auth' | 'convert' | 'reset';

interface BucketConfig {
  /** tokens added per interval */
  refillRate: number;
  /** refill interval */
  window: `${number} s`;
  /** bucket capacity = max burst size */
  maxTokens: number;
}

const LIMITS: Record<RateLimitName, BucketConfig> = {
  // LLM routes (summarize, course summary/quiz), keyed per user:
  // burst of 5, sustained 3/min. One PDF summary takes ~30-60s of LLM time,
  // so 3/min sustained is generous for a human and hostile to a script.
  ai: { refillRate: 3, window: '60 s', maxTokens: 5 },
  // Credential endpoints, keyed per IP: burst 5, then 5 per 5 min.
  auth: { refillRate: 5, window: '300 s', maxTokens: 5 },
  // PDF convert/translate (CPU-heavy, unauthenticated), keyed per IP:
  // burst 10, sustained 5/min.
  convert: { refillRate: 5, window: '60 s', maxTokens: 10 },
  // Password-reset flow (trigger + verify + set), keyed per IP and per account.
  // Window matches the 15-min token lifetime. Burst of 8 leaves room for a
  // legitimate user to mistype the code a few times, while capping an attacker
  // to a handful of guesses per account per token - which, against an 8-digit
  // code (10^8 space), makes brute-forcing infeasible.
  reset: { refillRate: 8, window: '900 s', maxTokens: 8 },
};

const limiters = new Map<RateLimitName, Ratelimit>();

function getLimiter(name: RateLimitName): Ratelimit | null {
  const redis = getRedis();
  if (!redis) return null;

  let limiter = limiters.get(name);
  if (!limiter) {
    const { refillRate, window, maxTokens } = LIMITS[name];
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.tokenBucket(refillRate, window, maxTokens),
      prefix: `ratelimit:${name}`,
    });
    limiters.set(name, limiter);
  }
  return limiter;
}

// ---- In-memory token bucket fallback (per-instance, dev only) ----

interface MemoryBucket {
  tokens: number;
  lastRefill: number;
}

const memoryBuckets = new Map<string, MemoryBucket>();

function memoryLimit(name: RateLimitName, identifier: string): RateLimitResult {
  const { refillRate, window, maxTokens } = LIMITS[name];
  const intervalMs = parseInt(window) * 1000;
  const key = `${name}:${identifier}`;
  const now = Date.now();

  let bucket = memoryBuckets.get(key);
  if (!bucket) {
    bucket = { tokens: maxTokens, lastRefill: now };
    memoryBuckets.set(key, bucket);
  }

  // Continuous refill proportional to elapsed time, capped at bucket size
  const elapsed = now - bucket.lastRefill;
  bucket.tokens = Math.min(maxTokens, bucket.tokens + (elapsed / intervalMs) * refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    const retryAfter = Math.ceil(((1 - bucket.tokens) / refillRate) * (intervalMs / 1000));
    return { success: false, retryAfter };
  }
  bucket.tokens -= 1;
  return { success: true };
}

export interface RateLimitResult {
  success: boolean;
  /** seconds until the caller may retry (only set on failure) */
  retryAfter?: number;
}

/**
 * Consume one token for the given identifier (user id or IP).
 * Fails open on Redis errors - a rate-limiter outage must not take the app down.
 */
export async function checkRateLimit(name: RateLimitName, identifier: string): Promise<RateLimitResult> {
  const limiter = getLimiter(name);
  if (!limiter) return memoryLimit(name, identifier);

  try {
    const { success, reset } = await limiter.limit(identifier);
    if (success) return { success: true };
    return { success: false, retryAfter: Math.max(1, Math.ceil((reset - Date.now()) / 1000)) };
  } catch (error) {
    console.error('[rate-limit] check failed, allowing request:', error);
    return { success: true };
  }
}

/**
 * Password-reset limiter. Checks BOTH the client IP and the target account
 * (email) against the `reset` bucket. The per-email key is the control that
 * matters against account takeover: it caps total guesses for a given account
 * regardless of how many IPs the attacker rotates through. Returns the first
 * failing result, or success if both pass.
 */
export async function checkResetRateLimit(
  request: NextRequest | Request,
  email: string
): Promise<RateLimitResult> {
  const byIp = await checkRateLimit('reset', `ip:${getClientIp(request)}`);
  if (!byIp.success) return byIp;

  const account = (email || '').toLowerCase().trim();
  if (account) {
    const byEmail = await checkRateLimit('reset', `email:${account}`);
    if (!byEmail.success) return byEmail;
  }
  return { success: true };
}

/** Best-effort client IP for per-IP limits behind Vercel's proxy. */
export function getClientIp(request: NextRequest | Request): string {
  const headers = request.headers;
  return (
    headers.get('x-real-ip') ||
    headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    'unknown'
  );
}

/** Standard 429 JSON response with Retry-After header. */
export function rateLimitResponse(result: RateLimitResult, message?: string): Response {
  return new Response(
    JSON.stringify({
      error: message || 'Too many requests. Please wait a moment and try again.',
      retryAfter: result.retryAfter,
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter ?? 60),
      },
    }
  );
}
