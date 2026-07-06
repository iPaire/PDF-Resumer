// lib/cache.ts - Distributed cache backed by Upstash Redis.
// The previous implementation cached summaries in a module-level Map, which on
// Vercel serverless is per-lambda-instance and lost on every cold start.
// Redis makes cache hits work across instances and deploys.
// Falls back to a bounded in-memory Map when Redis is not configured (dev).
import crypto from 'crypto';
import { getRedis } from './redis';

const memoryCache = new Map<string, { value: unknown; expiresAt: number }>();
const MEMORY_CACHE_MAX_ENTRIES = 200;

/** Stable cache key from arbitrary parts (full content, not a prefix - avoids collisions). */
export function cacheKey(namespace: string, ...parts: string[]): string {
  const digest = crypto.createHash('sha256').update(parts.join('|')).digest('hex');
  return `${namespace}:${digest}`;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const value = await redis.get<T>(key);
      return value ?? null;
    } catch (error) {
      console.error('[cache] Redis get failed:', error);
      return null;
    }
  }

  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value as T;
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(key, value, { ex: ttlSeconds });
      return;
    } catch (error) {
      console.error('[cache] Redis set failed:', error);
      return;
    }
  }

  // Bounded in-memory fallback: evict expired entries first, then oldest.
  if (memoryCache.size >= MEMORY_CACHE_MAX_ENTRIES) {
    const now = Date.now();
    for (const [k, v] of memoryCache) {
      if (now > v.expiresAt) memoryCache.delete(k);
    }
    if (memoryCache.size >= MEMORY_CACHE_MAX_ENTRIES) {
      const oldestKey = memoryCache.keys().next().value;
      if (oldestKey) memoryCache.delete(oldestKey);
    }
  }
  memoryCache.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}
