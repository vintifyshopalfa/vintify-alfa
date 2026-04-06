import { MedusaService } from "@medusajs/framework/utils"
import Post from "./models/post"
import Like from "./models/like"
import Comment from "./models/comment"

class SocialService extends MedusaService({ Post, Like, Comment }) {
  async toggleLike(
    customerId: string,
    targetType: "post" | "product",
    targetId: string
  ): Promise<{ liked: boolean; count: number }> {
    const existing = await this.listLikes({
      customer_id: customerId,
      target_type: targetType,
      target_id: targetId,
    })

    if (existing.length > 0) {
      await this.deleteLikes(existing[0].id)

      const remaining = await this.listLikes({ target_type: targetType, target_id: targetId })
      const remainingCount = remaining.length

      if (targetType === "post") {
        const posts = await this.listPosts({ id: targetId })
        if (posts.length > 0) {
          await this.updatePosts({ id: targetId }, { likes_count: remainingCount })
        }
      }
      return { liked: false, count: remainingCount }
    }

    await this.createLikes({
      customer_id: customerId,
      target_type: targetType,
      target_id: targetId,
    })

    if (targetType === "post") {
      const posts = await this.listPosts({ id: targetId })
      if (posts.length > 0) {
        const post = posts[0]
        const newCount = (post.likes_count || 0) + 1
        await this.updatePosts({ id: targetId }, { likes_count: newCount })
        return { liked: true, count: newCount }
      }
    }

    const likeCount = await this.listLikes({
      target_type: targetType,
      target_id: targetId,
    })
    return { liked: true, count: likeCount.length }
  }

  async getLikeCount(
    targetType: "post" | "product",
    targetId: string,
    customerId?: string
  ): Promise<{ count: number; liked: boolean }> {
    const likes = await this.listLikes({ target_type: targetType, target_id: targetId })
    const liked = customerId
      ? likes.some((l) => l.customer_id === customerId)
      : false
    return { count: likes.length, liked }
  }

  async createPostWithComment(
    postId: string,
    customerId: string,
    body: string
  ) {
    const comment = await this.createComments({ post_id: postId, customer_id: customerId, body })

    const posts = await this.listPosts({ id: postId })
    if (posts.length > 0) {
      const post = posts[0]
      await this.updatePosts({ id: postId }, { comments_count: (post.comments_count || 0) + 1 })
    }

    return comment
  }

  async getFeed(
    offset: number,
    limit: number,
    options?: { seller_id?: string; sort?: "recent" | "trending" }
  ) {
    const filters: Record<string, unknown> = {}
    if (options?.seller_id) {
      filters.seller_id = options.seller_id
    }

    const orderKey = options?.sort === "trending" ? "likes_count" : "created_at"
    const orderBy = { [orderKey]: "DESC" } as Record<string, "DESC">

    const [posts, allPosts] = await Promise.all([
      this.listPosts(filters, { skip: offset, take: limit, order: orderBy }),
      this.listPosts(filters),
    ])

    return { posts, count: allPosts.length }
  }
}

export default SocialService
