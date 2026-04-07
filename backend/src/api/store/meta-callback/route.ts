import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"

type SellerMember = { customer_id?: string; user_id?: string }
type SellerRecord = { id: string; members?: SellerMember[]; metadata?: Record<string, unknown> }
interface ISellerModuleService {
  listSellers(filters?: Record<string, unknown>, options?: Record<string, unknown>): Promise<SellerRecord[]>
  updateSellers(id: string, data: Record<string, unknown>): Promise<SellerRecord>
}

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const code = req.query.code as string | undefined
  const state = req.query.state as string | undefined
  const error = req.query.error as string | undefined

  const vendorPanelUrl = process.env.VENDOR_PANEL_URL || "http://localhost:6000"

  if (error || !code) {
    return res.redirect(`${vendorPanelUrl}/content/settings?meta_error=${encodeURIComponent(error || "access_denied")}`)
  }

  const appId = process.env.FACEBOOK_APP_ID
  const appSecret = process.env.FACEBOOK_APP_SECRET
  const backendUrl = process.env.BACKEND_URL || "http://localhost:9000"
  const redirectUri = `${backendUrl}/auth/meta/callback`

  if (!appId || !appSecret) {
    return res.redirect(`${vendorPanelUrl}/content/settings?meta_error=oauth_not_configured`)
  }

  let actorId: string | undefined
  try {
    const stateData = JSON.parse(Buffer.from(state || "", "base64url").toString())
    actorId = stateData.actor_id
  } catch {
    return res.redirect(`${vendorPanelUrl}/content/settings?meta_error=invalid_state`)
  }

  try {
    const tokenUrl = `https://graph.facebook.com/v18.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`
    const tokenResp = await fetch(tokenUrl)
    const tokenData = await tokenResp.json() as Record<string, unknown>

    if (!tokenResp.ok || !tokenData.access_token) {
      console.error("[Meta Callback] Token exchange failed:", tokenData)
      return res.redirect(`${vendorPanelUrl}/content/settings?meta_error=token_exchange_failed`)
    }

    const accessToken = tokenData.access_token as string

    const meResp = await fetch(`https://graph.facebook.com/v18.0/me?fields=id,name&access_token=${accessToken}`)
    const meData = await meResp.json() as Record<string, string>

    const sellerService = req.scope.resolve<ISellerModuleService>(SELLER_MODULE)
    const sellers = await sellerService.listSellers({}, { relations: ["members"] })
    const seller = sellers.find(s => s.members?.some(m => m.customer_id === actorId || m.user_id === actorId))

    if (!seller) {
      return res.redirect(`${vendorPanelUrl}/content/settings?meta_error=seller_not_found`)
    }

    const existing = (seller.metadata || {}) as Record<string, unknown>
    await sellerService.updateSellers(seller.id, {
      metadata: {
        ...existing,
        facebook_access_token: accessToken,
        facebook_page_id: meData.id,
        facebook_page_name: meData.name,
        meta_connected_at: new Date().toISOString(),
      },
    })

    return res.redirect(`${vendorPanelUrl}/content/settings?meta_connected=true`)
  } catch (e) {
    console.error("[Meta Callback] Error:", (e as Error).message)
    return res.redirect(`${vendorPanelUrl}/content/settings?meta_error=server_error`)
  }
}
