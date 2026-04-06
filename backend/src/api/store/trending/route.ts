import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialService from "../../../modules/social/service"

const QuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).optional(),
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = QuerySchema.safeParse(req.query ?? {})
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query parameters" })
  }

  const limit = Math.min(parseInt(parsed.data.limit || "12", 10), 50)

  const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)

  const trending = await socialService.getTrendingProductIds(limit)

  const counts: Record<string, number> = {}
  for (const item of trending) {
    counts[item.target_id] = item.count
  }

  return res.status(200).json({
    product_ids: trending.map((t) => t.target_id),
    counts,
  })
}
