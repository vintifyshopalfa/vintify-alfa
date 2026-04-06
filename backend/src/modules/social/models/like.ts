import { model } from "@medusajs/framework/utils"

const Like = model.define("social_like", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  target_type: model.text(),
  target_id: model.text(),
})

export default Like
