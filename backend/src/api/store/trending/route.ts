import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialService from "../../../modules/social/service"
import { Modules } from "@medusajs/framework/utils"

const QuerySchema = z.object({
  limit: z.string().regex(/^\d+$/).optional(),
  locale: z.string().optional(),
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = QuerySchema.safeParse(req.query ?? {})
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query parameters" })
  }

  const limit = Math.min(parseInt(parsed.data.limit || "12", 10), 50)

  const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)

  const likes = await socialService.listLikes({ target_type: "product" })

  const countMap: Record<string, number> = {}
  for (const like of likes) {
    countMap[like.target_id] = (countMap[like.target_id] || 0) + 1
  }

  const sortedProductIds = Object.entries(countMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id]) => id)

  if (sortedProductIds.length === 0) {
    return res.status(200).json({ product_ids: [], counts: {} })
  }

  return res.status(200).json({
    product_ids: sortedProductIds,
    counts: countMap,
  })
}
