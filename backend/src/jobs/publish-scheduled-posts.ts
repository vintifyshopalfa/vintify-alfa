import type { MedusaContainer } from "@medusajs/framework/types"
import { CMS_MODULE } from "../modules/cms"
import CmsService from "../modules/cms/service"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"
import { SOCIAL_MODULE } from "../modules/social"
import SocialService from "../modules/social/service"
import { publishPost } from "../services/meta-publisher"

export const config = {
  name: "publish-scheduled-posts",
  schedule: "* * * * *",
}

type SellerMember = { customer_id?: string; user_id?: string }
type SellerRecord = { id: string; members?: SellerMember[]; metadata?: Record<string, unknown> }
interface ISellerModuleService {
  listSellers(filters?: Record<string, unknown>, options?: Record<string, unknown>): Promise<SellerRecord[]>
}

export default async function publishScheduledPosts(container: MedusaContainer) {
  try {
    const cmsService: CmsService = container.resolve(CMS_MODULE)
    const sellerService = container.resolve<ISellerModuleService>(SELLER_MODULE)
    const socialService: SocialService = container.resolve(SOCIAL_MODULE)

    const scheduled = await cmsService.listCmsPosts({ status: "scheduled" })
    const now = new Date()

    const due = scheduled.filter(p => {
      const scheduledAt = p.scheduled_at
      return scheduledAt && new Date(scheduledAt as string) <= now
    })

    if (due.length === 0) return

    console.log(`[CMS Job] Publishing ${due.length} scheduled post(s)`)

    const sellers = await sellerService.listSellers({}, { relations: ["members"] })
    const sellerMap = new Map(sellers.map(s => [s.id, s]))

    for (const post of due) {
      try {
        const seller = sellerMap.get(post.seller_id as string)
        const meta = (seller?.metadata || {}) as Record<string, string>
        const channels = ((post.published_channels as unknown) as string[]) || []
        const mediaUrl = ((post.media_urls as unknown) as string[])?.[0]

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

        if (channels.includes("vintify") && seller) {
          const memberId = seller.members?.[0]?.customer_id || seller.id
          const vintifyPost = await socialService.createPosts([{
            seller_id: seller.id,
            customer_id: memberId,
            content: post.content,
            image_url: mediaUrl || null,
            product_id: null,
          }])
          externalIds.vintify = (vintifyPost[0] as { id: string }).id
        }

        if (result.error && Object.keys(externalIds).length === 0) {
          await cmsService.markFailed(post.id as string, result.error)
          console.warn(`[CMS Job] Post ${post.id} failed: ${result.error}`)
        } else {
          await cmsService.publishPost(post.id as string, channels, externalIds)
          console.log(`[CMS Job] Post ${post.id} published to: ${channels.join(", ")}`)
        }
      } catch (e) {
        console.error(`[CMS Job] Error publishing post ${post.id}:`, (e as Error).message)
        await cmsService.markFailed(post.id as string, (e as Error).message).catch(() => {})
      }
    }
  } catch (e) {
    console.error("[CMS Job] Fatal error:", (e as Error).message)
  }
}
