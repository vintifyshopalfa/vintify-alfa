import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { AUDIT_LOG_MODULE } from "../modules/audit-log"
import AuditLogService from "../modules/audit-log/service"

type SellerEventData = { id: string; actor_id?: string }

export default async function auditSellerSubscriber({
  event: { name, data },
  container,
}: SubscriberArgs<SellerEventData>) {
  try {
    const auditLogService: AuditLogService = container.resolve(AUDIT_LOG_MODULE)

    const actionMap: Record<string, string> = {
      "seller.created": "SELLER_CREATED",
      "seller.updated": "SELLER_UPDATED",
      "seller.deleted": "SELLER_DELETED",
      "seller.member_added": "SELLER_MEMBER_ADDED",
      "seller.member_removed": "SELLER_MEMBER_REMOVED",
      "seller.request_created": "SELLER_REQUEST_CREATED",
      "seller.request_approved": "SELLER_REQUEST_APPROVED",
      "seller.request_rejected": "SELLER_REQUEST_REJECTED",
    }

    const action = actionMap[name] ?? name.toUpperCase().replace(".", "_")

    await auditLogService.createLog({
      actor_id: data?.actor_id,
      actor_type: "admin",
      action,
      resource_type: "seller",
      resource_id: data?.id,
      metadata: { event: name },
    })
  } catch {
  }
}

export const config: SubscriberConfig = {
  event: [
    "seller.created",
    "seller.updated",
    "seller.deleted",
    "seller.member_added",
    "seller.member_removed",
    "seller.request_created",
    "seller.request_approved",
    "seller.request_rejected",
  ],
}
