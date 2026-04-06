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

      if (targetType === "post") {
        const posts = await this.listPosts({ id: targetId })
        if (posts.length > 0) {
          const post = posts[0]
          const newCount = Math.max(0, (post.likes_count || 0) - 1)
          await this.updatePosts({ id: targetId }, { likes_count: newCount })
          return { liked: false, count: newCount }
        }
      }
      return { liked: false, count: 0 }
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
    limit: number
  ) {
    const posts = await this.listPosts(
      {},
      { skip: offset, take: limit, order: { created_at: "DESC" } }
    )
    const allPosts = await this.listPosts({})
    return { posts, count: allPosts.length }
  }
}

export default SocialService
