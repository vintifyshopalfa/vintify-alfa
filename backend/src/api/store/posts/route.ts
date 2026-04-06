import type { AuthenticatedMedusaRequest, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialService from "../../../modules/social/service"

const GetPostsQuerySchema = z.object({
  offset: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  seller_id: z.string().optional(),
  sort: z.enum(["recent", "trending", "mixed"]).optional(),
})

const CreatePostSchema = z.object({
  body: z.string().min(1, "Post body is required").max(2000),
  images: z.array(z.string().url()).max(10).optional().default([]),
})

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = GetPostsQuerySchema.safeParse(req.query ?? {})
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query parameters", errors: parsed.error.errors })
  }

  const offset = parseInt(parsed.data.offset || "0", 10)
  const limit = Math.min(parseInt(parsed.data.limit || "20", 10), 50)
  const { seller_id, sort } = parsed.data

  const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)
  const { posts, count } = await socialService.getFeed(offset, limit, {
    seller_id,
    sort: sort as "recent" | "trending" | "mixed" | undefined,
  })

  return res.status(200).json({ posts, count, offset, limit })
}

export const POST = async (
  req: AuthenticatedMedusaRequest<unknown>,
  res: MedusaResponse
) => {
  const authCtx = req.auth_context
  if (!authCtx?.actor_id) {
    return res.status(401).json({ message: "Authentication required" })
  }

  const parsed = CreatePostSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
    })
  }

  const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)

  const post = await socialService.createPost({
    seller_id: authCtx.actor_id,
    body: parsed.data.body,
    images: parsed.data.images,
  })

  return res.status(201).json({ post })
}
