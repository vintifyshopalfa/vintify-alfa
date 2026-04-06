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

function parseImages(raw: unknown): string[] {
  if (typeof raw !== "string") return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as string[]) : []
  } catch {
    return []
  }
}

function entityToPostRecord(entity: {
  id: string
  seller_id: string
  body: string
  images: unknown
  likes_count: number
  comments_count: number
  created_at: Date
  updated_at: Date
}): PostRecord {
  return {
    id: entity.id,
    seller_id: entity.seller_id,
    body: entity.body,
    images: parseImages(entity.images),
    likes_count: entity.likes_count ?? 0,
    comments_count: entity.comments_count ?? 0,
    created_at: entity.created_at,
    updated_at: entity.updated_at,
  }
}

type EntityPost = Awaited<ReturnType<InstanceType<typeof SocialService>["listPosts"]>>[number]

class SocialService extends MedusaService({ Post, Like, Comment }) {
  async createPost(data: PostData): Promise<PostRecord> {
    const created = await this.createPosts({
      seller_id: data.seller_id,
      body: data.body,
      images: JSON.stringify(data.images),
      likes_count: data.likes_count ?? 0,
      comments_count: data.comments_count ?? 0,
    })
    return entityToPostRecord({
      id: created.id,
      seller_id: created.seller_id,
      body: created.body,
      images: created.images,
      likes_count: (created.likes_count as number) ?? 0,
      comments_count: (created.comments_count as number) ?? 0,
      created_at: created.created_at as Date,
      updated_at: created.updated_at as Date,
    })
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
        const newCount = ((post.likes_count as number) ?? 0) + 1
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
      const currentCount = (post.comments_count as number) ?? 0
      await this.updatePosts({ id: targetId }, { comments_count: currentCount + 1 })
    }

    return comment
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
      const followedIds = options?.followed_seller_ids ?? []

      const [recentRaw, popularRaw] = await Promise.all([
        this.listPosts(baseFilter, { skip: 0, take: 200, order: { created_at: "DESC" } }),
        this.listPosts(baseFilter, { skip: 0, take: 100, order: { likes_count: "DESC" } }),
      ])

      const seen = new Set<string>()
      const scored: Array<{ entity: EntityPost; score: number }> = []

      for (const entity of [...recentRaw, ...popularRaw]) {
        if (seen.has(entity.id)) continue
        seen.add(entity.id)

        const sellerId = entity.seller_id as string
        const likesCount = (entity.likes_count as number) ?? 0
        const createdAt = entity.created_at as Date

        let score = likesCount
        const ageHours = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60)
        score += Math.max(0, 168 - ageHours)
        if (followedIds.includes(sellerId)) {
          score += 100
        }
        scored.push({ entity, score })
      }

      scored.sort((a, b) => b.score - a.score)

      const poolCount = scored.length
      const paginated = scored.slice(offset, offset + limit).map((s) => entityToPostRecord({
        id: s.entity.id,
        seller_id: s.entity.seller_id as string,
        body: s.entity.body as string,
        images: s.entity.images,
        likes_count: (s.entity.likes_count as number) ?? 0,
        comments_count: (s.entity.comments_count as number) ?? 0,
        created_at: s.entity.created_at as Date,
        updated_at: s.entity.updated_at as Date,
      }))
      return { posts: paginated, count: poolCount }
    }

    const orderKey = options?.sort === "trending" ? "likes_count" : "created_at"
    const orderBy = { [orderKey]: "DESC" } as Record<string, "DESC">

    const [postsRaw, allRaw] = await Promise.all([
      this.listPosts(baseFilter, { skip: offset, take: limit, order: orderBy }),
      this.listPosts(baseFilter),
    ])

    const posts = postsRaw.map((e) => entityToPostRecord({
      id: e.id,
      seller_id: e.seller_id as string,
      body: e.body as string,
      images: e.images,
      likes_count: (e.likes_count as number) ?? 0,
      comments_count: (e.comments_count as number) ?? 0,
      created_at: e.created_at as Date,
      updated_at: e.updated_at as Date,
    }))

    return { posts, count: allRaw.length }
  }
}

export default SocialService
