import { defineMiddlewares } from "@medusajs/framework/http"
import type { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import rateLimit from "express-rate-limit"

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

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many authentication attempts, please try again later." },
  skip: () => process.env.NODE_ENV === "test",
})

export default defineMiddlewares({
  routes: [
    {
      matcher: "/**",
      middlewares: [securityHeaders],
    },
    {
      matcher: "/auth/*",
      middlewares: [authRateLimit as unknown as Parameters<typeof defineMiddlewares>[0]["routes"][0]["middlewares"][0]],
    },
  ],
})
