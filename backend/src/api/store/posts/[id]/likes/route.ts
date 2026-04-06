import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SOCIAL_MODULE } from "../../../../../modules/social"
import SocialService from "../../../../../modules/social/service"

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

  const posts = await socialService.listPosts({ id })
  if (posts.length === 0) {
    return res.status(404).json({ message: "Post not found" })
  }

  const result = await socialService.toggleLike(authCtx.actor_id, "post", id)
  return res.status(200).json(result)
}
