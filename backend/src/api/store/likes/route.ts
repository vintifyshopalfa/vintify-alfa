import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialService from "../../../modules/social/service"

const QuerySchema = z.object({
  target_type: z.enum(["post", "product"]).optional(),
})

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const parsed = QuerySchema.safeParse(req.query ?? {})
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query parameters" })
  }

  const authCtx = req.auth_context
  if (!authCtx?.actor_id) {
    return res.status(401).json({ message: "Authentication required" })
  }

  const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)

  const filters: Record<string, unknown> = { customer_id: authCtx.actor_id }
  if (parsed.data.target_type) {
    filters.target_type = parsed.data.target_type
  }

  const likes = await socialService.listLikes(filters)

  return res.status(200).json({
    likes,
    post_ids: likes.filter((l) => l.target_type === "post").map((l) => l.target_id),
    product_ids: likes.filter((l) => l.target_type === "product").map((l) => l.target_id),
  })
}
