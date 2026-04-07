"use client"

import { useState, useCallback } from "react"
import { PostCard } from "@/components/organisms/PostCard/PostCard"
import { type SocialPost } from "@/lib/data/social"
import { Button } from "@/components/atoms"
import { useTranslations } from "next-intl"

type FeedInfiniteScrollProps = {
  initialPosts: SocialPost[]
  initialCount: number
  limit?: number
}

export const FeedInfiniteScroll = ({
  initialPosts,
  initialCount,
  limit = 20,
}: FeedInfiniteScrollProps) => {
  const t = useTranslations("feed")
  const [posts, setPosts] = useState<SocialPost[]>(initialPosts)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialCount > initialPosts.length)

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)

    try {
      const nextPage = page + 1
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"}/store/posts?page=${nextPage}&limit=${limit}`,
        {
          credentials: "include",
          headers: {
            "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
          },
        }
      )
      if (res.ok) {
        const data = await res.json()
        const newPosts: SocialPost[] = data.posts || []
        setPosts(prev => [...prev, ...newPosts])
        setPage(nextPage)
        setHasMore(posts.length + newPosts.length < data.count)
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }, [loading, hasMore, page, limit, posts.length])

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
        <p className="heading-sm mb-2">{t("noPosts")}</p>
        <p className="text-sm">{t("firstToShare")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="secondary"
            onClick={loadMore}
            disabled={loading}
            className="min-w-[160px]"
          >
            {loading ? t("loading") : t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  )
}
