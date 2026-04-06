import { model } from "@medusajs/framework/utils"

const AuditLog = model.define("audit_logs", {
  id: model.id().primaryKey(),
  actor_id: model.text().nullable(),
  actor_type: model.text().default("system"),
  action: model.text(),
  resource_type: model.text(),
  resource_id: model.text().nullable(),
  metadata: model.json().nullable(),
  ip_address: model.text().nullable(),
  user_agent: model.text().nullable(),
})

export default AuditLog
