import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"
import { CMS_MODULE } from "../../../../../modules/cms"
import CmsService from "../../../../../modules/cms/service"
import { z } from "zod"

const UpdatePostSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  media_urls: z.array(z.string().url()).optional(),
  status: z.enum(["draft", "scheduled"]).optional(),
  published_channels: z.array(z.enum(["vintify", "instagram", "facebook"])).optional(),
  scheduled_at: z.string().datetime().optional().nullable(),
})

type SellerMember = { customer_id?: string; user_id?: string }
type SellerRecord = { id: string; members?: SellerMember[] }
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

export const PATCH = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await resolveSellerForActor(req)
  if (!seller) return res.status(401).json({ message: "Authentication required" })

  const { id } = req.params as { id: string }
  const parsed = UpdatePostSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ message: "Validation failed", errors: parsed.error.errors })
  }

  try {
    const cmsService: CmsService = req.scope.resolve(CMS_MODULE)
    const existing = await cmsService.listCmsPosts({ id, seller_id: seller.id })
    if (!existing.length) return res.status(404).json({ message: "Post not found" })

    const updateData: Record<string, unknown> = {}
    if (parsed.data.content !== undefined) updateData.content = parsed.data.content
    if (parsed.data.media_urls !== undefined) updateData.media_urls = parsed.data.media_urls
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status
    if (parsed.data.published_channels !== undefined) updateData.published_channels = parsed.data.published_channels
    if ("scheduled_at" in parsed.data) {
      updateData.scheduled_at = parsed.data.scheduled_at ? new Date(parsed.data.scheduled_at as string) : null
    }

    const updated = await cmsService.updateCmsPosts({ id }, updateData)
    return res.json({ post: updated[0] ?? updated })
  } catch (e) {
    console.error("[CMS] PATCH /vendor/cms/posts/:id:", (e as Error).message)
    return res.status(500).json({ message: "Failed to update post" })
  }
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const seller = await resolveSellerForActor(req)
  if (!seller) return res.status(401).json({ message: "Authentication required" })

  const { id } = req.params as { id: string }

  try {
    const cmsService: CmsService = req.scope.resolve(CMS_MODULE)
    const existing = await cmsService.listCmsPosts({ id, seller_id: seller.id })
    if (!existing.length) return res.status(404).json({ message: "Post not found" })

    await cmsService.deleteCmsPosts(id)
    return res.status(200).json({ message: "Post deleted" })
  } catch (e) {
    console.error("[CMS] DELETE /vendor/cms/posts/:id:", (e as Error).message)
    return res.status(500).json({ message: "Failed to delete post" })
  }
}
