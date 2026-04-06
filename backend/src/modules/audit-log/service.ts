import { MedusaService } from "@medusajs/framework/utils"
import AuditLog from "./models/audit-log"

type CreateAuditLogInput = {
  actor_id?: string
  actor_type?: string
  action: string
  resource_type: string
  resource_id?: string
  metadata?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
}

class AuditLogService extends MedusaService({ AuditLog }) {
  async createLog(input: CreateAuditLogInput): Promise<void> {
    const sanitized = this.sanitizeMetadata(input.metadata)
    await this.createAuditLogs([
      {
        actor_id: input.actor_id,
        actor_type: input.actor_type || "system",
        action: input.action,
        resource_type: input.resource_type,
        resource_id: input.resource_id,
        metadata: sanitized,
        ip_address: input.ip_address,
        user_agent: input.user_agent,
      },
    ])
  }

  private sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!metadata) return undefined
    const SENSITIVE_KEYS = ["password", "token", "secret", "card_number", "cvv", "ssn", "cpf"]
    const sanitized: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(metadata)) {
      const lowerKey = key.toLowerCase()
      if (SENSITIVE_KEYS.some((k) => lowerKey.includes(k))) {
        sanitized[key] = "[REDACTED]"
      } else {
        sanitized[key] = value
      }
    }
    return sanitized
  }
}

export default AuditLogService
