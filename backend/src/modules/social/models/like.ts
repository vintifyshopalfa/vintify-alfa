import { model } from "@medusajs/framework/utils"

const Like = model.define("social_like", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  resource_type: model.text(),
  resource_id: model.text(),
})

export default Like
