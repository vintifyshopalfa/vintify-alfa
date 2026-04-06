import type { AuthenticatedMedusaRequest, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { SOCIAL_MODULE } from "../../../../../modules/social"
import SocialService from "../../../../../modules/social/service"

const CreateCommentSchema = z.object({
  body: z.string().min(1, "Comment cannot be empty").max(1000),
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { id } = req.params
  const offset = parseInt(String(req.query.offset || "0"), 10)
  const limit = Math.min(parseInt(String(req.query.limit || "20"), 10), 100)

  const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)
  const [comments, allComments] = await Promise.all([
    socialService.listComments(
      { post_id: id, target_type: "post" },
      { skip: offset, take: limit, order: { created_at: "ASC" } }
    ),
    socialService.listComments({ post_id: id, target_type: "post" }),
  ])

  return res.status(200).json({ comments, total: allComments.length, offset, limit })
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

  const parsed = CreateCommentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
    })
  }

  const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)

  const posts = await socialService.listPosts({ id })
  if (posts.length === 0) {
    return res.status(404).json({ message: "Post not found" })
  }

  const comment = await socialService.addComment(id, authCtx.actor_id, parsed.data.body)
  return res.status(201).json({ comment })
}
