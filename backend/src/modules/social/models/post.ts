import { model } from "@medusajs/framework/utils"

const Post = model.define("social_post", {
  id: model.id().primaryKey(),
  seller_id: model.text(),
  customer_id: model.text(),
  content: model.text(),
  image_url: model.text().nullable(),
  product_id: model.text().nullable(),
})

export default Post
