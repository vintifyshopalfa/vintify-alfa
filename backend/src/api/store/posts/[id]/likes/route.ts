import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SOCIAL_MODULE } from "../../../../../modules/social"
import SocialService from "../../../../../modules/social/service"

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const customerId = req.auth_context?.actor_id || null

  try {
    const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)
    const state = await socialService.getLikeState(customerId, "post", id)
    return res.json(state)
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch like state" })
  }
}

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const customerId = req.auth_context?.actor_id
  if (!customerId) return res.status(401).json({ message: "Authentication required" })

  const { id } = req.params

  try {
    const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)
    const result = await socialService.toggleLike(customerId, "post", id)
    return res.json(result)
  } catch (error) {
    return res.status(500).json({ message: "Failed to toggle like" })
  }
}
