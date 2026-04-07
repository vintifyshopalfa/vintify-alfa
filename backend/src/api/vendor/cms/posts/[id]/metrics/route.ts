import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"
import { CMS_MODULE } from "../../../../../../modules/cms"
import CmsService from "../../../../../../modules/cms/service"
import { getInstagramInsights } from "../../../../../../services/meta-publisher"

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

  const { id } = req.params as { id: string }

  try {
    const cmsService: CmsService = req.scope.resolve(CMS_MODULE)
    const [post] = await cmsService.listCmsPosts({ id, seller_id: seller.id })
    if (!post) return res.status(404).json({ message: "Post not found" })

    const externalIds = (post.external_post_ids || {}) as Record<string, string>
    const meta = (seller.metadata || {}) as Record<string, string>

    const metrics: Record<string, unknown> = {
      status: post.status,
      published_at: post.published_at,
      channels: post.published_channels,
    }

    if (externalIds.instagram && meta.instagram_access_token) {
      metrics.instagram = await getInstagramInsights(externalIds.instagram, meta.instagram_access_token)
    }

    if (externalIds.facebook) {
      metrics.facebook = {
        note: "Facebook Insights available via Business Manager",
        post_id: externalIds.facebook,
      }
    }

    if (externalIds.vintify) {
      metrics.vintify = { post_id: externalIds.vintify }
    }

    return res.json({ metrics })
  } catch (e) {
    console.error("[CMS] GET metrics:", (e as Error).message)
    return res.status(500).json({ message: "Failed to fetch metrics" })
  }
}
