import { model } from "@medusajs/framework/utils"

const Comment = model.define("social_comment", {
  id: model.id().primaryKey(),
  post_id: model.text(),
  target_type: model.text().default("post"),
  customer_id: model.text(),
  body: model.text(),
})

export default Comment
