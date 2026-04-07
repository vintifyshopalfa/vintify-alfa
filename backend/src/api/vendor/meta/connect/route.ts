import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"
import { z } from "zod"

const SaveTokenSchema = z.object({
  platform: z.enum(["instagram", "facebook"]),
  access_token: z.string().min(1),
  user_id: z.string().optional(),
  page_id: z.string().optional(),
  username: z.string().optional(),
  page_name: z.string().optional(),
})

type SellerMember = { customer_id?: string; user_id?: string }
type SellerRecord = { id: string; members?: SellerMember[]; metadata?: Record<string, unknown> }
interface ISellerModuleService {
  listSellers(filters?: Record<string, unknown>, options?: Record<string, unknown>): Promise<SellerRecord[]>
  updateSellers(id: string, data: Record<string, unknown>): Promise<SellerRecord>
}

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const appId = process.env.FACEBOOK_APP_ID
  const backendUrl = process.env.BACKEND_URL || "http://localhost:9000"
  const redirectUri = `${backendUrl}/auth/meta/callback`

  if (!appId) {
    return res.json({
      oauth_url: null,
      message: "Meta OAuth not configured. Set FACEBOOK_APP_ID and FACEBOOK_APP_SECRET env vars. You can also save tokens manually via POST.",
      manual_token_supported: true,
    })
  }

  const actorId = req.auth_context?.actor_id
  const state = Buffer.from(JSON.stringify({ actor_id: actorId, ts: Date.now() })).toString("base64url")

  const scope = "instagram_basic,instagram_content_publish,pages_manage_posts,pages_read_engagement"
  const oauthUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}&response_type=code`

  return res.json({ oauth_url: oauthUrl })
}

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const actorId = req.auth_context?.actor_id
  if (!actorId) return res.status(401).json({ message: "Authentication required" })

  const parsed = SaveTokenSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors })
  }

  const { platform, access_token, user_id, page_id, username, page_name } = parsed.data

  try {
    const sellerService = req.scope.resolve<ISellerModuleService>(SELLER_MODULE)
    const sellers = await sellerService.listSellers({}, { relations: ["members"] })
    const seller = sellers.find(s => s.members?.some(m => m.customer_id === actorId || m.user_id === actorId))
    if (!seller) return res.status(403).json({ message: "Seller not found" })

    const existing = (seller.metadata || {}) as Record<string, string>
    const updates: Record<string, string> = {}

    if (platform === "instagram") {
      updates.instagram_access_token = access_token
      if (user_id) updates.instagram_user_id = user_id
      if (username) updates.instagram_username = username
    } else {
      updates.facebook_access_token = access_token
      if (page_id) updates.facebook_page_id = page_id
      if (page_name) updates.facebook_page_name = page_name
    }

    await sellerService.updateSellers(seller.id, {
      metadata: { ...existing, ...updates },
    })

    return res.json({ message: `${platform} connected successfully` })
  } catch (e) {
    console.error("[Meta] POST /vendor/meta/connect:", (e as Error).message)
    return res.status(500).json({ message: "Failed to save token" })
  }
}
