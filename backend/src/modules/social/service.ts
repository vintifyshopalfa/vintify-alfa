import { MedusaService } from "@medusajs/framework/utils"
import Post from "./models/post"
import Like from "./models/like"
import Comment from "./models/comment"

export type PostWithImages = {
  id: string
  seller_id: string
  body: string
  images: string[]
  likes_count: number
  comments_count: number
  created_at: Date
  updated_at: Date
}

function deserializePost(raw: Record<string, unknown>): PostWithImages {
  const imagesRaw = raw.images
  let images: string[] = []
  if (Array.isArray(imagesRaw)) {
    images = imagesRaw as string[]
  } else if (typeof imagesRaw === "string") {
    try { images = JSON.parse(imagesRaw) } catch { images = [] }
  }
  return { ...raw, images } as unknown as PostWithImages
}

class SocialService extends MedusaService({ Post, Like, Comment }) {
  async createPost(data: { seller_id: string; body: string; images: string[] }): Promise<PostWithImages> {
    const created = await this.createPosts({
      seller_id: data.seller_id,
      body: data.body,
      images: data.images as unknown as Record<string, unknown>,
    })
    return deserializePost(created as unknown as Record<string, unknown>)
  }

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

    const allLikes = await this.listLikes({ target_type: targetType, target_id: targetId })
    return { liked: true, count: allLikes.length }
  }

  async getLikeCount(
    targetType: "post" | "product",
    targetId: string,
    customerId?: string
  ): Promise<{ count: number; liked: boolean }> {
    const likes = await this.listLikes({ target_type: targetType, target_id: targetId })
    const liked = customerId ? likes.some((l) => l.customer_id === customerId) : false
    return { count: likes.length, liked }
  }

  async addComment(
    targetId: string,
    customerId: string,
    body: string
  ) {
    const comment = await this.createComments({ post_id: targetId, customer_id: customerId, body })

    const posts = await this.listPosts({ id: targetId })
    if (posts.length > 0) {
      const post = posts[0]
      await this.updatePosts({ id: targetId }, { comments_count: (post.comments_count || 0) + 1 })
    }

    return comment
  }

  async getTrendingProductIds(limit: number): Promise<Array<{ target_id: string; count: number }>> {
    const allProductLikes = await this.listLikes(
      { target_type: "product" },
      { take: 5000, order: { id: "DESC" } }
    )

    const countMap: Map<string, number> = new Map()
    for (const like of allProductLikes) {
      countMap.set(like.target_id, (countMap.get(like.target_id) || 0) + 1)
    }

    return Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([target_id, count]) => ({ target_id, count }))
  }

  async getFeed(
    offset: number,
    limit: number,
    options?: { seller_id?: string; sort?: "recent" | "trending" | "mixed" }
  ): Promise<{ posts: PostWithImages[]; count: number }> {
    const filters: Record<string, unknown> = {}
    if (options?.seller_id) {
      filters.seller_id = options.seller_id
    }

    let rawPosts: unknown[]
    let totalCount: number

    if (options?.sort === "mixed" || (!options?.sort && !options?.seller_id)) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

      const [recentPosts, popularPosts] = await Promise.all([
        this.listPosts(
          { ...filters, created_at: { $gte: sevenDaysAgo } as unknown as string },
          { skip: 0, take: limit * 2, order: { created_at: "DESC" } }
        ),
        this.listPosts(
          filters,
          { skip: 0, take: limit, order: { likes_count: "DESC" } }
        ),
      ])

      const seen = new Set<string>()
      const merged: unknown[] = []
      for (const p of [...recentPosts, ...popularPosts]) {
        const post = p as Record<string, unknown>
        if (!seen.has(post.id as string)) {
          seen.add(post.id as string)
          merged.push(p)
        }
      }

      const paginated = merged.slice(offset, offset + limit)
      const countRaw = await this.listPosts(filters)
      rawPosts = paginated
      totalCount = countRaw.length
    } else {
      const orderKey = options?.sort === "trending" ? "likes_count" : "created_at"
      const orderBy = { [orderKey]: "DESC" } as Record<string, "DESC">

      const [posts, allPosts] = await Promise.all([
        this.listPosts(filters, { skip: offset, take: limit, order: orderBy }),
        this.listPosts(filters),
      ])
      rawPosts = posts
      totalCount = allPosts.length
    }

    const posts = (rawPosts as Array<Record<string, unknown>>).map(deserializePost)
    return { posts, count: totalCount }
  }
}

export default SocialService
