import { model } from "@medusajs/framework/utils"

const Comment = model.define("social_comment", {
  id: model.id().primaryKey(),
  post_id: model.text(),
  customer_id: model.text(),
  content: model.text(),
})

export default Comment
