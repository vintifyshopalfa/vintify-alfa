import { defineMiddlewares } from "@medusajs/framework/http"
import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"

function securityHeaders(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) {
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("X-Frame-Options", "DENY")
  res.setHeader("X-XSS-Protection", "1; mode=block")
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")
  res.setHeader("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  )
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
  }
  res.removeHeader("X-Powered-By")
  next()
}

const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000
const AUTH_RATE_MAX = 20
const AUTH_RATE_KEY_PREFIX = "auth_rl:"

type RateLimitRecord = { count: number; resetAt: number }

const memStore = new Map<string, RateLimitRecord>()

interface RedisClient {
  incr(key: string): Promise<number>
  expire(key: string, seconds: number): Promise<number>
  ttl(key: string): Promise<number>
}

let redisClient: RedisClient | null = null

async function getRedisClient(): Promise<RedisClient | null> {
  if (redisClient !== null) return redisClient
  if (!process.env.REDIS_URL) return null
  try {
    const iored = await import("ioredis")
    const RedisClass = iored.Redis ?? iored.default
    redisClient = new RedisClass(process.env.REDIS_URL, {
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    }) as unknown as RedisClient
    return redisClient
  } catch {
    return null
  }
}

async function isRateLimited(ip: string): Promise<boolean> {
  if (process.env.NODE_ENV === "test") return false

  const redis = await getRedisClient()
  if (redis) {
    try {
      const key = `${AUTH_RATE_KEY_PREFIX}${ip}`
      const count = await redis.incr(key)
      if (count === 1) {
        await redis.expire(key, AUTH_RATE_WINDOW_MS / 1000)
      }
      return count > AUTH_RATE_MAX
    } catch {
      // Redis error → fall through to in-memory
    }
  }

  const now = Date.now()
  const record = memStore.get(ip)
  if (!record || now >= record.resetAt) {
    memStore.set(ip, { count: 1, resetAt: now + AUTH_RATE_WINDOW_MS })
    return false
  }
  if (record.count >= AUTH_RATE_MAX) return true
  record.count++
  return false
}

function applyAuthRateLimit(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction): void {
  const ip =
    (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim() ??
    req.socket?.remoteAddress ??
    "unknown"

  isRateLimited(ip).then((limited) => {
    if (limited) {
      res.status(429).json({ message: "Too many authentication attempts, please try again later." })
    } else {
      next()
    }
  }).catch(() => next())
}

export default defineMiddlewares({
  routes: [
    {
      matcher: "/**",
      middlewares: [securityHeaders],
    },
    {
      matcher: "/auth/*",
      middlewares: [applyAuthRateLimit],
    },
    {
      matcher: "/store/auth/*",
      middlewares: [applyAuthRateLimit],
    },
  ],
})
