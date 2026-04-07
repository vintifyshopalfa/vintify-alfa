import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"
import { CMS_MODULE } from "../../../../../../modules/cms"
import CmsService from "../../../../../../modules/cms/service"
import { SOCIAL_MODULE } from "../../../../../../modules/social"
import SocialService from "../../../../../../modules/social/service"
import { publishPost } from "../../../../../../services/meta-publisher"
import { z } from "zod"

const PublishSchema = z.object({
  channels: z.array(z.enum(["vintify", "instagram", "facebook"])).min(1),
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

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await resolveSellerForActor(req)
  if (!seller) return res.status(401).json({ message: "Authentication required" })

  const { id } = req.params as { id: string }
  const parsed = PublishSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors })
  }

  const { channels } = parsed.data

  try {
    const cmsService: CmsService = req.scope.resolve(CMS_MODULE)
    const [post] = await cmsService.listCmsPosts({ id, seller_id: seller.id })
    if (!post) return res.status(404).json({ message: "Post not found" })

    const meta = (seller.metadata || {}) as Record<string, string>
    const mediaUrl = (post.media_urls as string[])?.[0]

    const result = await publishPost({
      content: post.content,
      media_url: mediaUrl,
      channels,
      instagram_user_id: meta.instagram_user_id,
      instagram_access_token: meta.instagram_access_token,
      facebook_page_id: meta.facebook_page_id,
      facebook_access_token: meta.facebook_access_token,
    })

    const externalIds: Record<string, string> = {}
    if (result.instagram_post_id) externalIds.instagram = result.instagram_post_id
    if (result.facebook_post_id) externalIds.facebook = result.facebook_post_id

    if (channels.includes("vintify")) {
      try {
        const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)
        const vintifyPost = await socialService.createPosts([{
          seller_id: seller.id,
          customer_id: req.auth_context?.actor_id || seller.id,
          content: post.content,
          image_url: mediaUrl || null,
          product_id: null,
        }])
        externalIds.vintify = (vintifyPost[0] as { id: string }).id
      } catch (e) {
        console.warn("[CMS] Failed to create Vintify post:", (e as Error).message)
      }
    }

    if (result.error && Object.keys(externalIds).length === 0) {
      await cmsService.markFailed(id, result.error)
      return res.status(502).json({ message: "Publishing failed", error: result.error })
    }

    const publishedChannels = channels.filter(c => {
      if (c === "instagram") return !!result.instagram_post_id
      if (c === "facebook") return !!result.facebook_post_id
      if (c === "vintify") return !!externalIds.vintify
      return false
    })

    await cmsService.publishPost(id, publishedChannels, externalIds)

    return res.json({
      message: "Post published",
      channels: publishedChannels,
      external_post_ids: externalIds,
      warnings: result.error || null,
    })
  } catch (e) {
    console.error("[CMS] POST /vendor/cms/posts/:id/publish:", (e as Error).message)
    return res.status(500).json({ message: "Failed to publish post" })
  }
}
