"use client"

import { useState, useTransition, useCallback, useRef, useEffect } from "react"
import type { Post, Comment } from "@/lib/data/social"
import { PostCard } from "./PostCard"

type FeedClientWrapperProps = {
  initialPosts: Post[]
  initialCount: number
  isAuthenticated: boolean
  onLike: (postId: string) => Promise<{ liked: boolean; count: number } | null>
  onComment: (postId: string, body: string) => Promise<Comment | null>
  onLoadComments: (postId: string, offset: number) => Promise<{ comments: Comment[] }>
  onLoadMore: (offset: number) => Promise<{ posts: Post[]; count: number }>
}

export function FeedClientWrapper({
  initialPosts,
  initialCount,
  isAuthenticated,
  onLike,
  onComment,
  onLoadComments,
  onLoadMore,
}: FeedClientWrapperProps) {
  const [posts, setPosts] = useState<Post[]>(initialPosts)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()
  const loaderRef = useRef<HTMLDivElement>(null)

  const loadMore = useCallback(() => {
    if (isPending || posts.length >= count) return
    startTransition(async () => {
      const result = await onLoadMore(posts.length)
      setPosts((prev) => [...prev, ...result.posts])
      setCount(result.count)
    })
  }, [isPending, posts.length, count, onLoadMore])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore()
      },
      { threshold: 0.1, rootMargin: "100px" }
    )
    const el = loaderRef.current
    if (el) observer.observe(el)
    return () => { if (el) observer.unobserve(el) }
  }, [loadMore])

  if (posts.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-5xl mb-4">📸</div>
        <h3 className="text-lg font-semibold text-gray-700 mb-2">No posts yet</h3>
        <p className="text-gray-500 text-sm">Sellers will start sharing their items here.</p>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto">
      <div className="space-y-4">
        {posts.map((post) => (
          <PostCard
            key={post.id}
            post={post}
            isAuthenticated={isAuthenticated}
            onLike={onLike}
            onComment={onComment}
            onLoadComments={onLoadComments}
          />
        ))}
      </div>

      <div ref={loaderRef} className="h-16 flex items-center justify-center mt-6">
        {isPending && (
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Loading more...
          </div>
        )}
        {!isPending && posts.length >= count && posts.length > 0 && (
          <p className="text-sm text-gray-400">You&apos;re all caught up</p>
        )}
      </div>
    </div>
  )
}
