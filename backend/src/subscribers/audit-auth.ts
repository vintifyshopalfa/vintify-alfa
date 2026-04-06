import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { AUDIT_LOG_MODULE } from "../modules/audit-log"
import AuditLogService from "../modules/audit-log/service"

export default async function auditAuthSubscriber({
  event: { name, data },
  container,
}: SubscriberArgs<{ actor_id?: string; id?: string }>) {
  try {
    const auditLogService: AuditLogService = container.resolve(AUDIT_LOG_MODULE)

    const actionMap: Record<string, string> = {
      "auth.token_generated": "USER_LOGIN",
      "auth.password_reset": "PASSWORD_RESET",
    }

    const action = actionMap[name] || name.toUpperCase().replace(".", "_")
    const actorId = data?.actor_id || data?.id

    await auditLogService.createLog({
      actor_id: actorId,
      actor_type: "customer",
      action,
      resource_type: "auth",
      resource_id: actorId,
      metadata: { event: name },
    })
  } catch (error) {
    console.error("[AuditLog] Failed to write auth audit entry:", (error as Error).message)
  }
}

export const config: SubscriberConfig = {
  event: [
    "auth.token_generated",
    "auth.token_revoked",
    "auth.password_reset",
    "auth.password_reset_requested",
  ],
}
