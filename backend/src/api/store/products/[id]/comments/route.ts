import type { AuthenticatedMedusaRequest, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { SOCIAL_MODULE } from "../../../../../modules/social"
import SocialService from "../../../../../modules/social/service"

const GetCommentsSchema = z.object({
  offset: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
})

const PostCommentSchema = z.object({
  body: z.string().min(1, "Comment body is required").max(1000),
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const id = (req.params as Record<string, string>).id

  const parsed = GetCommentsSchema.safeParse(req.query ?? {})
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query parameters" })
  }

  const offset = parseInt(parsed.data.offset || "0", 10)
  const limit = Math.min(parseInt(parsed.data.limit || "20", 10), 100)

  const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)
  const [comments, allComments] = await Promise.all([
    socialService.listComments(
      { post_id: id, target_type: "product" },
      { skip: offset, take: limit, order: { created_at: "ASC" } }
    ),
    socialService.listComments({ post_id: id, target_type: "product" }),
  ])

  return res.status(200).json({ comments, total: allComments.length, offset, limit })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<unknown>,
  res: MedusaResponse
) => {
  const id = (req.params as Record<string, string>).id

  const authCtx = req.auth_context
  if (!authCtx?.actor_id) {
    return res.status(401).json({ message: "Authentication required" })
  }

  const parsed = PostCommentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
    })
  }

  const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)
  const comment = await socialService.createComments({
    post_id: id,
    target_type: "product",
    customer_id: authCtx.actor_id,
    body: parsed.data.body,
  })

  return res.status(201).json({ comment })
}
