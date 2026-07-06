// lib/redis.ts - Shared Upstash Redis client (serverless-safe).
// Returns null when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set,
// so local dev works without Redis and callers can degrade gracefully.
import { Redis } from '@upstash/redis';

let redis: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (redis !== undefined) return redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn('[redis] UPSTASH_REDIS_REST_URL/TOKEN not set - falling back to in-memory cache/rate-limit (per-instance only)');
    redis = null;
    return redis;
  }

  redis = new Redis({ url, token });
  return redis;
}
