import { MedusaService } from "@medusajs/framework/utils"
import Post from "./models/post"
import Like from "./models/like"
import Comment from "./models/comment"

export type PostData = {
  seller_id: string
  body: string
  images: string[]
  likes_count?: number
  comments_count?: number
}

export type PostRecord = {
  id: string
  seller_id: string
  body: string
  images: string[]
  likes_count: number
  comments_count: number
  created_at: Date
  updated_at: Date
}

function parseImages(raw: string): string[] {
  if (typeof raw !== "string") return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function toPostRecord(raw: Record<string, unknown>): PostRecord {
  return {
    id: raw.id as string,
    seller_id: raw.seller_id as string,
    body: raw.body as string,
    images: parseImages(raw.images as string),
    likes_count: (raw.likes_count as number) ?? 0,
    comments_count: (raw.comments_count as number) ?? 0,
    created_at: raw.created_at as Date,
    updated_at: raw.updated_at as Date,
  }
}

class SocialService extends MedusaService({ Post, Like, Comment }) {
  async createPost(data: PostData): Promise<PostRecord> {
    const created = await this.createPosts({
      seller_id: data.seller_id,
      body: data.body,
      images: JSON.stringify(data.images),
      likes_count: data.likes_count ?? 0,
      comments_count: data.comments_count ?? 0,
    })
    return toPostRecord(created as unknown as Record<string, unknown>)
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

    await this.createLikes({ customer_id: customerId, target_type: targetType, target_id: targetId })

    if (targetType === "post") {
      const posts = await this.listPosts({ id: targetId })
      if (posts.length > 0) {
        const post = posts[0]
        const newCount = ((post.likes_count as number) || 0) + 1
        await this.updatePosts({ id: targetId }, { likes_count: newCount })
        return { liked: true, count: newCount }
      }
    }

    const allLikes = await this.listLikes({ target_type: targetType, target_id: targetId })
    return { liked: true, count: allLikes.length }
  }

  async addComment(targetId: string, customerId: string, body: string) {
    const comment = await this.createComments({
      post_id: targetId,
      target_type: "post",
      customer_id: customerId,
      body,
    })

    const posts = await this.listPosts({ id: targetId })
    if (posts.length > 0) {
      const post = posts[0]
      await this.updatePosts({ id: targetId }, { comments_count: ((post.comments_count as number) || 0) + 1 })
    }

    return comment
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

  async getTrendingProductIds(limit: number): Promise<Array<{ target_id: string; count: number }>> {
    const allProductLikes = await this.listLikes(
      { target_type: "product" },
      { take: 5000, order: { id: "DESC" } }
    )

    const countMap = new Map<string, number>()
    for (const like of allProductLikes) {
      const id = like.target_id as string
      countMap.set(id, (countMap.get(id) ?? 0) + 1)
    }

    return Array.from(countMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([target_id, count]) => ({ target_id, count }))
  }

  async getFeed(
    offset: number,
    limit: number,
    options?: {
      seller_id?: string
      sort?: "recent" | "trending" | "mixed"
      followed_seller_ids?: string[]
    }
  ): Promise<{ posts: PostRecord[]; count: number }> {
    const baseFilter: Record<string, unknown> = {}
    if (options?.seller_id) {
      baseFilter.seller_id = options.seller_id
    }

    if (options?.sort === "mixed" || (!options?.sort && !options?.seller_id)) {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const followedIds = options?.followed_seller_ids ?? []

      const [recentRaw, popularRaw] = await Promise.all([
        this.listPosts(
          { ...baseFilter, created_at: { $gte: sevenDaysAgo } as unknown as string },
          { skip: 0, take: limit * 3, order: { created_at: "DESC" } }
        ),
        this.listPosts(baseFilter, { skip: 0, take: limit * 2, order: { likes_count: "DESC" } }),
      ])

      const seen = new Set<string>()
      const scored: Array<{ raw: Record<string, unknown>; score: number }> = []

      const allRaw = [...recentRaw, ...popularRaw] as Array<Record<string, unknown>>
      for (const raw of allRaw) {
        const id = raw.id as string
        if (seen.has(id)) continue
        seen.add(id)

        let score = (raw.likes_count as number) ?? 0
        const ageMs = Date.now() - new Date(raw.created_at as Date).getTime()
        const ageHours = ageMs / (1000 * 60 * 60)
        score += Math.max(0, 72 - ageHours)
        if (followedIds.includes(raw.seller_id as string)) {
          score += 100
        }
        scored.push({ raw, score })
      }

      scored.sort((a, b) => b.score - a.score)

      const allCount = await this.listPosts(baseFilter).then((r) => r.length)
      const paginated = scored.slice(offset, offset + limit).map((s) => toPostRecord(s.raw))
      return { posts: paginated, count: allCount }
    }

    const orderKey = options?.sort === "trending" ? "likes_count" : "created_at"
    const orderBy = { [orderKey]: "DESC" } as Record<string, "DESC">

    const [postsRaw, allRaw] = await Promise.all([
      this.listPosts(baseFilter, { skip: offset, take: limit, order: orderBy }),
      this.listPosts(baseFilter),
    ])

    return {
      posts: (postsRaw as Array<Record<string, unknown>>).map(toPostRecord),
      count: allRaw.length,
    }
  }
}

export default SocialService
