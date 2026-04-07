import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"

type SellerMember = { customer_id?: string; user_id?: string }
type SellerRecord = { id: string; members?: SellerMember[]; metadata?: Record<string, unknown> }
interface ISellerModuleService {
  listSellers(filters?: Record<string, unknown>, options?: Record<string, unknown>): Promise<SellerRecord[]>
}

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const actorId = req.auth_context?.actor_id
  if (!actorId) return res.status(401).json({ message: "Authentication required" })

  const sellerService = req.scope.resolve<ISellerModuleService>(SELLER_MODULE)
  const sellers = await sellerService.listSellers({}, { relations: ["members"] })
  const seller = sellers.find(s => s.members?.some(m => m.customer_id === actorId || m.user_id === actorId))
  if (!seller) return res.status(403).json({ message: "Seller not found" })

  const meta = (seller.metadata || {}) as Record<string, string>

  return res.json({
    instagram: {
      connected: !!(meta.instagram_user_id && meta.instagram_access_token),
      user_id: meta.instagram_user_id || null,
      username: meta.instagram_username || null,
    },
    facebook: {
      connected: !!(meta.facebook_page_id && meta.facebook_access_token),
      page_id: meta.facebook_page_id || null,
      page_name: meta.facebook_page_name || null,
    },
  })
}
