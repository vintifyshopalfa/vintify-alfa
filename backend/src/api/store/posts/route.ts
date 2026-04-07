import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialService from "../../../modules/social/service"
import { ICustomerModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

const CreatePostSchema = z.object({
  content: z.string().min(1).max(2000),
  image_url: z.string().url().optional().nullable(),
  product_id: z.string().optional().nullable(),
})

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  try {
    const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)

    const page = Number(req.query.page) || 1
    const limit = Math.min(Number(req.query.limit) || 20, 50)
    const offset = (page - 1) * limit

    const sellerFilter = req.query.seller_id as string | undefined
    const postFilter = sellerFilter ? { seller_id: sellerFilter } : {}

    const allPosts = await socialService.listPosts(postFilter, { order: { created_at: "DESC" }, skip: offset, take: limit })
    const total = await socialService.listPosts(postFilter).then(p => p.length)

    const customerId = req.auth_context?.actor_id || null

    const postsWithMeta = await Promise.all(
      allPosts.map(async (post: Record<string, unknown>) => {
        const likeState = await socialService.getLikeState(customerId, "post", post.id as string)
        const comments = await socialService.listComments({ post_id: post.id as string }, { order: { created_at: "ASC" }, take: 3 })
        const commentCount = await socialService.listComments({ post_id: post.id as string }).then(c => c.length)

        let authorName = "Seller"
        try {
          const customerService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER)
          const customer = await customerService.retrieveCustomer(post.customer_id as string)
          authorName = `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() || customer.email || "Seller"
        } catch {}

        return {
          ...post,
          author_name: authorName,
          likes: likeState.count,
          liked: likeState.liked,
          comment_count: commentCount,
          recent_comments: comments,
        }
      })
    )

    return res.json({ posts: postsWithMeta, count: total, page, limit })
  } catch (error) {
    console.error("[Social] GET /store/posts error:", (error as Error).message)
    return res.status(500).json({ message: "Failed to fetch posts" })
  }
}

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Authentication required" })
  }

  const parsed = CreatePostSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.errors.map(e => ({ field: e.path.join("."), message: e.message })),
    })
  }

  try {
    const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)

    const sellerId = req.query.seller_id as string | undefined

    const post = await socialService.createPosts([
      {
        seller_id: sellerId || customerId,
        customer_id: customerId,
        content: parsed.data.content,
        image_url: parsed.data.image_url || null,
        product_id: parsed.data.product_id || null,
      },
    ])

    return res.status(201).json({ post: post[0] })
  } catch (error) {
    console.error("[Social] POST /store/posts error:", (error as Error).message)
    return res.status(500).json({ message: "Failed to create post" })
  }
}
