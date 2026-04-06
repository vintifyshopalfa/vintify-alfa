import type { AuthenticatedMedusaRequest, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SOCIAL_MODULE } from "../../../../../modules/social"
import SocialService from "../../../../../modules/social/service"

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const authCtx = (req as AuthenticatedMedusaRequest<unknown>).auth_context
  const customerId = authCtx?.actor_id

  const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)
  const { count, liked } = await socialService.getLikeCount("product", id, customerId)

  return res.status(200).json({ count, liked })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<unknown>,
  res: MedusaResponse
) => {
  const authCtx = req.auth_context
  if (!authCtx?.actor_id) {
    return res.status(401).json({ message: "Authentication required" })
  }

  const { id } = req.params
  const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)

  const result = await socialService.toggleLike(authCtx.actor_id, "product", id)
  return res.status(200).json(result)
}
