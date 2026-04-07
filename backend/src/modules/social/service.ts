import { MedusaService } from "@medusajs/framework/utils"
import Post from "./models/post"
import Like from "./models/like"
import Comment from "./models/comment"

class SocialService extends MedusaService({ Post, Like, Comment }) {
  async toggleLike(customerId: string, resourceType: string, resourceId: string): Promise<{ liked: boolean; count: number }> {
    const existing = await this.listLikes({
      customer_id: customerId,
      resource_type: resourceType,
      resource_id: resourceId,
    })

    if (existing.length > 0) {
      await this.deleteLikes(existing[0].id)
      const remaining = await this.listLikes({ resource_type: resourceType, resource_id: resourceId })
      return { liked: false, count: remaining.length }
    }

    await this.createLikes([{ customer_id: customerId, resource_type: resourceType, resource_id: resourceId }])
    const total = await this.listLikes({ resource_type: resourceType, resource_id: resourceId })
    return { liked: true, count: total.length }
  }

  async getLikeState(customerId: string | null, resourceType: string, resourceId: string): Promise<{ liked: boolean; count: number }> {
    const all = await this.listLikes({ resource_type: resourceType, resource_id: resourceId })
    const liked = customerId ? all.some((l: { customer_id: string }) => l.customer_id === customerId) : false
    return { liked, count: all.length }
  }
}

export default SocialService
