import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { AUDIT_LOG_MODULE } from "../modules/audit-log"
import AuditLogService from "../modules/audit-log/service"

export default async function auditOrderSubscriber({
  event: { name, data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const auditLogService: AuditLogService = container.resolve(AUDIT_LOG_MODULE)

  const actionMap: Record<string, string> = {
    "order.placed": "ORDER_PLACED",
    "order.canceled": "ORDER_CANCELED",
    "order.completed": "ORDER_COMPLETED",
    "order.return_requested": "RETURN_REQUESTED",
    "order.refund_created": "REFUND_CREATED",
  }

  const action = actionMap[name] || name.toUpperCase().replace(".", "_")

  await auditLogService.createLog({
    action,
    resource_type: "order",
    resource_id: data?.id,
    actor_type: "system",
    metadata: { event: name },
  })
}

export const config: SubscriberConfig = {
  event: [
    "order.placed",
    "order.canceled",
    "order.completed",
    "order.return_requested",
    "order.refund_created",
  ],
}
