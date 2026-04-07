import { model } from "@medusajs/framework/utils"

const CmsPost = model.define("cms_post", {
  id: model.id().primaryKey(),
  seller_id: model.text(),
  content: model.text(),
  media_urls: model.json().nullable(),
  status: model.text().default("draft"),
  published_channels: model.json().nullable(),
  scheduled_at: model.dateTime().nullable(),
  published_at: model.dateTime().nullable(),
  external_post_ids: model.json().nullable(),
  failure_reason: model.text().nullable(),
})

export default CmsPost
