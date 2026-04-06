import type { AuthenticatedMedusaRequest, MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { SOCIAL_MODULE } from "../../../modules/social"
import SocialService from "../../../modules/social/service"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"

const GetPostsQuerySchema = z.object({
  offset: z.string().regex(/^\d+$/).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
  seller_id: z.string().optional(),
  sort: z.enum(["recent", "trending", "mixed"]).optional(),
  followed_sellers: z.string().optional(),
})

const CreatePostSchema = z.object({
  body: z.string().min(1, "Post body is required").max(2000),
  images: z.array(z.string().url()).max(10).optional().default([]),
})

type SellerMember = { customer_id?: string }
type SellerRecord = { id: string; members?: SellerMember[] }

interface ISellerModuleService {
  listSellers(
    filters?: Record<string, unknown>,
    options?: Record<string, unknown>
  ): Promise<SellerRecord[]>
}

async function getSellerByCustomerId(
  sellerService: ISellerModuleService,
  customerId: string
): Promise<SellerRecord | null> {
  const sellers = await sellerService.listSellers(
    {},
    { relations: ["members"], take: 1000 }
  )
  return sellers.find((s) =>
    s.members?.some((m) => m.customer_id === customerId)
  ) ?? null
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const parsed = GetPostsQuerySchema.safeParse(req.query ?? {})
  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid query parameters", errors: parsed.error.errors })
  }

  const offset = parseInt(parsed.data.offset || "0", 10)
  const limit = Math.min(parseInt(parsed.data.limit || "20", 10), 50)
  const { seller_id, sort, followed_sellers } = parsed.data
  const followedSellerIds = followed_sellers
    ? followed_sellers.split(",").filter(Boolean)
    : []

  const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)
  const { posts, count } = await socialService.getFeed(offset, limit, {
    seller_id,
    sort: sort as "recent" | "trending" | "mixed" | undefined,
    followed_seller_ids: followedSellerIds,
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

  const sellerService = req.scope.resolve<ISellerModuleService>(SELLER_MODULE)
  const seller = await getSellerByCustomerId(sellerService, authCtx.actor_id)

  if (!seller) {
    return res.status(403).json({ message: "Only sellers can create posts. Please set up your seller account first." })
  }

  const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)
  const post = await socialService.createPost({
    seller_id: seller.id,
    body: parsed.data.body,
    images: parsed.data.images,
  })

  return res.status(201).json({ post })
}
