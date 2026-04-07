import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"
import { CMS_MODULE } from "../../../../modules/cms"
import CmsService from "../../../../modules/cms/service"
import { z } from "zod"

const CreatePostSchema = z.object({
  content: z.string().min(1).max(5000),
  media_urls: z.array(z.string().url()).optional().default([]),
  status: z.enum(["draft", "scheduled"]).optional().default("draft"),
  published_channels: z.array(z.enum(["vintify", "instagram", "facebook"])).optional().default([]),
  scheduled_at: z.string().datetime().optional().nullable(),
})

type SellerMember = { customer_id?: string; user_id?: string }
type SellerRecord = { id: string; members?: SellerMember[]; metadata?: Record<string, unknown> }
interface ISellerModuleService {
  listSellers(filters?: Record<string, unknown>, options?: Record<string, unknown>): Promise<SellerRecord[]>
}

async function resolveSellerForActor(req: AuthenticatedMedusaRequest): Promise<SellerRecord | null> {
  const actorId = req.auth_context?.actor_id
  if (!actorId) return null
  const sellerService = req.scope.resolve<ISellerModuleService>(SELLER_MODULE)
  const sellers = await sellerService.listSellers({}, { relations: ["members"] })
  return sellers.find(s => s.members?.some(m => m.customer_id === actorId || m.user_id === actorId)) ?? null
}

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await resolveSellerForActor(req)
  if (!seller) return res.status(401).json({ message: "Authentication required" })

  const status = req.query.status as string | undefined
  const filters: Record<string, unknown> = {}
  if (status) filters.status = status

  try {
    const cmsService: CmsService = req.scope.resolve(CMS_MODULE)
    const posts = await cmsService.getVendorPosts(seller.id, filters)
    return res.json({ posts, count: posts.length })
  } catch (e) {
    console.error("[CMS] GET /vendor/cms/posts:", (e as Error).message)
    return res.status(500).json({ message: "Failed to fetch posts" })
  }
}

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await resolveSellerForActor(req)
  if (!seller) return res.status(401).json({ message: "Authentication required" })

  const parsed = CreatePostSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.errors.map(e => ({ field: e.path.join("."), message: e.message })),
    })
  }

  try {
    const cmsService: CmsService = req.scope.resolve(CMS_MODULE)
    const post = await cmsService.createCmsPosts([{
      seller_id: seller.id,
      content: parsed.data.content,
      media_urls: parsed.data.media_urls,
      status: parsed.data.status,
      published_channels: parsed.data.published_channels,
      scheduled_at: parsed.data.scheduled_at ? new Date(parsed.data.scheduled_at) : null,
      published_at: null,
      external_post_ids: {},
      failure_reason: null,
    }])
    return res.status(201).json({ post: post[0] })
  } catch (e) {
    console.error("[CMS] POST /vendor/cms/posts:", (e as Error).message)
    return res.status(500).json({ message: "Failed to create post" })
  }
}
