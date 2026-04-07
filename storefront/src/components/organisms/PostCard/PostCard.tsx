"use client"

import Image from "next/image"
import { Avatar } from "@/components/atoms"
import { LikeButton } from "@/components/atoms/LikeButton/LikeButton"
import { CommentThread } from "@/components/molecules/CommentThread/CommentThread"
import { type SocialPost } from "@/lib/data/social"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { MessageIcon } from "@/icons"
import { useState } from "react"

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString()
}

export const PostCard = ({ post }: { post: SocialPost }) => {
  const [showComments, setShowComments] = useState(false)

  return (
    <article className="bg-white border rounded-lg overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <Avatar initials={post.author_name?.charAt(0)?.toUpperCase() || "S"} size="small" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate">{post.author_name}</p>
          <p className="text-xs text-neutral-400">{formatRelativeTime(post.created_at)}</p>
        </div>
        {post.product_id && (
          <LocalizedClientLink
            href={`/products/${post.product_id}`}
            className="text-xs text-action bg-brand-50 px-2 py-1 rounded-full hover:bg-brand-100 transition-colors"
          >
            View product
          </LocalizedClientLink>
        )}
      </div>

      <p className="px-4 pb-3 text-sm whitespace-pre-wrap">{post.content}</p>

      {post.image_url && (
        <div className="relative w-full aspect-square bg-neutral-50">
          <Image
            src={post.image_url}
            alt="Post image"
            fill
            className="object-cover"
            sizes="(min-width: 768px) 600px, 100vw"
          />
        </div>
      )}

      <div className="px-4 py-3 flex items-center gap-4 border-t">
        <LikeButton
          resourceType="post"
          resourceId={post.id}
          initialLiked={post.liked}
          initialCount={post.likes}
        />
        <button
          onClick={() => setShowComments(!showComments)}
          className="flex items-center gap-1.5 text-neutral-400 hover:text-neutral-700 transition-colors"
          aria-label="Toggle comments"
        >
          <MessageIcon size={20} />
          {post.comment_count > 0 && (
            <span className="text-sm font-medium">{post.comment_count}</span>
          )}
        </button>
      </div>

      {showComments && (
        <div className="px-4 pb-4">
          <CommentThread
            postId={post.id}
            initialComments={post.recent_comments}
            initialCount={post.comment_count}
          />
        </div>
      )}
    </article>
  )
}
