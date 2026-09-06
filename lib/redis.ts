import Redis from "ioredis";

// AttendTrack uses Redis for two things:
//   1. Read-through caching: employees:all, attendance:<date>
//   2. Idempotency-Key locks on POST endpoints
//
// If Redis is not running, every helper here fails soft (returns
// null / false / no-ops) so the app keeps working off Prisma alone
// instead of crashing — this keeps `npm run dev` usable without
// having Redis installed.

const globalForRedis = globalThis as unknown as { redis?: Redis; redisReady?: boolean };

function createClient(): Redis {
  const client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: 1,
    retryStrategy: () => null, // don't keep retrying forever
    lazyConnect: false,
    reconnectOnError: () => false,
  });
  client.on("error", () => {
    // Swallow — callers below check isReady() before using the client.
    globalForRedis.redisReady = false;
  });
  client.on("ready", () => {
    globalForRedis.redisReady = true;
  });
  return client;
}

export const redis = globalForRedis.redis ?? createClient();
if (process.env.NODE_ENV !== "production") globalForRedis.redis = redis;

function isReady() {
  return redis.status === "ready";
}

export const CACHE_TTL = {
  EMPLOYEES: 60 * 60, // 1 hour
  ATTENDANCE_DAY: 60 * 10, // 10 minutes
  IDEMPOTENCY: 60 * 60 * 24, // 24 hours
};

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isReady()) return null;
  try {
    const raw = await redis.get(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  if (!isReady()) return;
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    /* ignore */
  }
}

export async function cacheDel(...keys: string[]): Promise<void> {
  if (!isReady() || keys.length === 0) return;
  try {
    await redis.del(...keys);
  } catch {
    /* ignore */
  }
}

export async function cacheDelByPrefix(prefix: string): Promise<void> {
  if (!isReady()) return;
  try {
    const keys = await redis.keys(`${prefix}*`);
    if (keys.length) await redis.del(...keys);
  } catch {
    /* ignore */
  }
}

/**
 * Claims an Idempotency-Key for a given route so a retried POST
 * (double-tap, network retry) is not applied twice.
 * Returns true the first time a key is seen, false on repeat.
 * If Redis is unreachable, always returns true (no protection,
 * but the app still functions).
 */
export async function claimIdempotencyKey(key: string): Promise<boolean> {
  if (!key) return true;
  if (!isReady()) return true;
  try {
    const result = await redis.set(`idempotency:${key}`, "1", "EX", CACHE_TTL.IDEMPOTENCY, "NX");
    return result === "OK";
  } catch {
    return true;
  }
}
