import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialService from "../../../modules/social/service"
import { ICustomerModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

type FeedMode = "for_you" | "following"

function normalizeFeedMode(value: unknown): FeedMode {
  return value === "following" ? "following" : "for_you"
}

function parseFollowingSellerIds(value: unknown): string[] {
  if (typeof value !== "string" || !value.trim()) return []
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean)
}

function scorePost(post: Record<string, unknown>, opts: {
  mode: FeedMode
  followingSellerIds: string[]
  likes: number
  comments: number
}): number {
  const createdAtRaw = post.created_at
  const createdAt = typeof createdAtRaw === "string" ? new Date(createdAtRaw).getTime() : Date.now()
  const ageHours = Math.max(1, Math.floor((Date.now() - createdAt) / (1000 * 60 * 60)))
  const recencyBoost = 100 / ageHours
  const engagement = opts.likes * 2 + opts.comments * 3
  const sellerId = String(post.seller_id || "")
  const followingBoost = opts.followingSellerIds.includes(sellerId) ? 25 : 0
  const modeBoost = opts.mode === "following" && opts.followingSellerIds.includes(sellerId) ? 35 : 0
  const productBoost = post.product_id ? 5 : 0

  return recencyBoost + engagement + followingBoost + modeBoost + productBoost
}

const CreatePostSchema = z.object({
  content: z.string().min(1).max(2000),
  image_url: z.string().url().optional().nullable(),
  product_id: z.string().optional().nullable(),
})

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  try {
    const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)
    const customerService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER)

    const page = Number(req.query.page) || 1
    const limit = Math.min(Number(req.query.limit) || 20, 50)
    const offset = (page - 1) * limit
    const mode = normalizeFeedMode(req.query.mode)
    const followingSellerIds = parseFollowingSellerIds(req.query.following_seller_ids)

    const sellerFilter = req.query.seller_id as string | undefined
    const modeFilter = mode === "following" && followingSellerIds.length
      ? { seller_id: followingSellerIds }
      : {}
    const postFilter = {
      ...(sellerFilter ? { seller_id: sellerFilter } : {}),
      ...modeFilter,
    }

    const rawPosts = await socialService.listPosts(postFilter, {
      order: { created_at: "DESC" },
      skip: offset,
      take: limit,
    })
    const total = await socialService.listPosts(postFilter).then((p) => p.length)

    const customerId = req.auth_context?.actor_id || null

    const postsWithMeta = await Promise.all(
      rawPosts.map(async (post: Record<string, unknown>) => {
        const likeState = await socialService.getLikeState(customerId, "post", post.id as string)
        const comments = await socialService.listComments({ post_id: post.id as string }, { order: { created_at: "ASC" }, take: 3 })
        const commentCount = await socialService.listComments({ post_id: post.id as string }).then(c => c.length)

        let authorName = "Seller"
        try {
          const customer = await customerService.retrieveCustomer(post.customer_id as string)
          authorName = `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() || customer.email || "Seller"
        } catch {}

        const score = scorePost(post, {
          mode,
          followingSellerIds,
          likes: likeState.count,
          comments: commentCount,
        })

        return {
          ...post,
          author_name: authorName,
          likes: likeState.count,
          liked: likeState.liked,
          comment_count: commentCount,
          recent_comments: comments,
          score,
        }
      })
    )

    const sortedPosts =
      mode === "for_you"
        ? postsWithMeta.sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))
        : postsWithMeta

    return res.json({ posts: sortedPosts, count: total, page, limit, mode })
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
