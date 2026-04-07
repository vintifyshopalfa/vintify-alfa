import { MedusaService } from "@medusajs/framework/utils"
import CmsPost from "./models/cms-post"

class CmsService extends MedusaService({ CmsPost }) {
  async getVendorPosts(seller_id: string, filters?: Record<string, unknown>) {
    return this.listCmsPosts(
      { seller_id, ...filters },
      { order: { created_at: "DESC" } }
    )
  }

  async publishPost(id: string, channels: string[], externalIds: Record<string, string>) {
    return this.updateCmsPosts({ id } as any, {
      status: "published",
      published_channels: channels as unknown as Record<string, unknown>,
      external_post_ids: externalIds as unknown as Record<string, unknown>,
      published_at: new Date(),
      failure_reason: null,
    } as any)
  }

  async markFailed(id: string, reason: string) {
    return this.updateCmsPosts({ id } as any, {
      status: "failed",
      failure_reason: reason,
    } as any)
  }
}

export default CmsService
