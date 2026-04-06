"use client"

import Image from "next/image"
import { useState } from "react"
import { LikeButton } from "./LikeButton"
import { CommentThread } from "./CommentThread"
import type { Post, Comment } from "@/lib/data/social"

type PostCardProps = {
  post: Post
  isAuthenticated: boolean
  onLike: (postId: string) => Promise<{ liked: boolean; count: number } | null>
  onComment: (postId: string, body: string) => Promise<Comment | null>
  initialComments?: Comment[]
}

export function PostCard({
  post,
  isAuthenticated,
  onLike,
  onComment,
  initialComments = [],
}: PostCardProps) {
  const [activeImage, setActiveImage] = useState(0)

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime()
    const days = Math.floor(diff / 86400000)
    if (days > 30) return new Date(date).toLocaleDateString()
    if (days > 0) return `${days}d ago`
    const hours = Math.floor(diff / 3600000)
    if (hours > 0) return `${hours}h ago`
    return "just now"
  }

  return (
    <article className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
      <div className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: "#09B1BA" }}
          >
            {post.seller_id.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Seller</p>
            <time className="text-xs text-gray-400">{timeAgo(post.created_at)}</time>
          </div>
        </div>

        {post.body && (
          <p className="text-sm text-gray-700 mb-3 leading-relaxed">{post.body}</p>
        )}
      </div>

      {post.images.length > 0 && (
        <div className="relative">
          <div className="relative aspect-square bg-gray-50 overflow-hidden">
            <Image
              src={post.images[activeImage]}
              alt="Post image"
              fill
              className="object-cover"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          </div>
          {post.images.length > 1 && (
            <div className="flex gap-1 p-3 overflow-x-auto no-scrollbar">
              {post.images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`relative w-12 h-12 flex-shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                    activeImage === i ? "border-teal-500" : "border-transparent"
                  }`}
                >
                  <Image src={img} alt={`Thumbnail ${i + 1}`} fill className="object-cover" sizes="48px" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="px-4 py-3 flex items-center gap-4 border-t border-gray-50">
        <LikeButton
          initialLiked={false}
          initialCount={post.likes_count}
          onToggle={() => onLike(post.id)}
          requiresAuth={isAuthenticated}
          size="sm"
        />
        <CommentThread
          postId={post.id}
          initialComments={initialComments}
          onSubmit={onComment}
          isAuthenticated={isAuthenticated}
        />
      </div>
    </article>
  )
}
