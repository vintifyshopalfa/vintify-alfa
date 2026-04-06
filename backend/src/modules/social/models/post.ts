import { model } from "@medusajs/framework/utils"

const Post = model.define("social_post", {
  id: model.id().primaryKey(),
  seller_id: model.text(),
  body: model.text(),
  images: model.json(),
  likes_count: model.number().default(0),
  comments_count: model.number().default(0),
})

export default Post
