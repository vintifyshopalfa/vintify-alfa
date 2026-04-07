"use client"

import { useState, useCallback } from "react"
import { PostCard } from "@/components/organisms/PostCard/PostCard"
import { type FeedMode, type SocialPost } from "@/lib/data/social"
import { useTranslations } from "next-intl"

type FeedInfiniteScrollProps = {
  initialPosts: SocialPost[]
  initialCount: number
  limit?: number
  compact?: boolean
}

export const FeedInfiniteScroll = ({
  initialPosts,
  initialCount,
  limit = 20,
  compact = false,
}: FeedInfiniteScrollProps) => {
  const t = useTranslations("feed")
  const [posts, setPosts] = useState<SocialPost[]>(initialPosts)
  const [page, setPage] = useState(1)
  const [mode, setMode] = useState<FeedMode>("for_you")
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(initialCount > initialPosts.length)

  const baseUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

  const switchMode = useCallback(async (nextMode: FeedMode) => {
    if (loading || mode === nextMode) return
    setLoading(true)

    try {
      const res = await fetch(
        `${baseUrl}/store/posts?page=1&limit=${Math.min(limit, 8)}&mode=${nextMode}`,
        {
          credentials: "include",
          headers: {
            "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
          },
        }
      )

      if (res.ok) {
        const data = await res.json()
        const fetchedPosts: SocialPost[] = data.posts || []
        setPosts(fetchedPosts)
        setPage(1)
        setMode(nextMode)
        setHasMore(fetchedPosts.length < (data.count || 0))
      }
    } finally {
      setLoading(false)
    }
  }, [baseUrl, limit, loading, mode])

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    setLoading(true)

    try {
      const nextPage = page + 1
      const res = await fetch(
        `${baseUrl}/store/posts?page=${nextPage}&limit=${limit}&mode=${mode}`,
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
        setPosts((prev: SocialPost[]) => [...prev, ...newPosts])
        setPage(nextPage)
        setHasMore(posts.length + newPosts.length < (data.count || 0))
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }, [baseUrl, hasMore, limit, loading, mode, page, posts.length])

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
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => switchMode("for_you")}
          disabled={loading}
          className={`px-4 py-2 rounded-sm text-sm transition-colors ${
            mode === "for_you"
              ? "bg-action text-action-on-primary"
              : "bg-action-secondary text-action-on-secondary"
          }`}
        >
          {t("forYou")}
        </button>
        <button
          type="button"
          onClick={() => switchMode("following")}
          disabled={loading}
          className={`px-4 py-2 rounded-sm text-sm transition-colors ${
            mode === "following"
              ? "bg-action text-action-on-primary"
              : "bg-action-secondary text-action-on-secondary"
          }`}
        >
          {t("following")}
        </button>
      </div>

      {posts.map((post: SocialPost) => (
        <PostCard key={post.id} post={post} />
      ))}

      {hasMore && !compact && (
        <div className="flex justify-center pt-4">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="min-w-[160px] px-4 py-2 rounded-sm text-sm bg-action-secondary text-action-on-secondary disabled:opacity-60"
          >
            {loading ? t("loading") : t("loadMore")}
          </button>
        </div>
      )}
    </div>
  )
}
