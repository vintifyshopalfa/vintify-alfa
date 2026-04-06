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

type RateLimitRecord = { count: number; resetAt: number }

const AUTH_RATE_WINDOW_MS = 15 * 60 * 1000
const AUTH_RATE_MAX = 20
const authRateLimitStore = new Map<string, RateLimitRecord>()

function applyAuthRateLimit(req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction): void {
  if (process.env.NODE_ENV === "test") {
    next()
    return
  }

  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
    ?? req.socket?.remoteAddress
    ?? "unknown"

  const now = Date.now()
  const record = authRateLimitStore.get(ip)

  if (!record || now >= record.resetAt) {
    authRateLimitStore.set(ip, { count: 1, resetAt: now + AUTH_RATE_WINDOW_MS })
    next()
    return
  }

  if (record.count >= AUTH_RATE_MAX) {
    res.status(429).json({ message: "Too many authentication attempts, please try again later." })
    return
  }

  record.count++
  next()
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
