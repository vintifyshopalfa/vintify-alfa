"use client"

import { useState } from "react"
import { Button, Avatar, Textarea } from "@/components/atoms"
import { type SocialComment } from "@/lib/data/social"

type CommentThreadProps = {
  postId: string
  initialComments: SocialComment[]
  initialCount: number
}

export const CommentThread = ({ postId, initialComments, initialCount }: CommentThreadProps) => {
  const [comments, setComments] = useState<SocialComment[]>(initialComments)
  const [count, setCount] = useState(initialCount)
  const [content, setContent] = useState("")
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [loadingAll, setLoadingAll] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || loading) return
    setLoading(true)

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"}/store/posts/${postId}/comments`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
          },
          body: JSON.stringify({ content: content.trim() }),
        }
      )

      if (res.ok) {
        const data = await res.json()
        setComments(prev => [...prev, data.comment])
        setCount(prev => prev + 1)
        setContent("")
      } else if (res.status === 401) {
        window.location.href = "/account"
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }

  const loadAllComments = async () => {
    if (loadingAll) return
    setLoadingAll(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"}/store/posts/${postId}/comments`,
        {
          credentials: "include",
          headers: {
            "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
          },
        }
      )
      if (res.ok) {
        const data = await res.json()
        setComments(data.comments)
        setExpanded(true)
      }
    } catch {
    } finally {
      setLoadingAll(false)
    }
  }

  const displayComments = expanded ? comments : comments.slice(-3)

  return (
    <div className="mt-3 space-y-2">
      {!expanded && count > 3 && (
        <button
          onClick={loadAllComments}
          className="text-sm text-action hover:underline"
          disabled={loadingAll}
        >
          {loadingAll ? "Loading..." : `View all ${count} comments`}
        </button>
      )}

      {displayComments.map(comment => (
        <div key={comment.id} className="flex gap-2 items-start">
          <Avatar initials={comment.author_name?.charAt(0)?.toUpperCase() || "U"} size="small" />
          <div className="flex-1 bg-neutral-25 rounded-xl px-3 py-2">
            <span className="text-xs font-semibold">{comment.author_name}</span>
            <p className="text-sm mt-0.5 whitespace-pre-wrap">{comment.content}</p>
          </div>
        </div>
      ))}

      <form onSubmit={handleSubmit} className="flex gap-2 items-end mt-2">
        <Textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write a comment..."
          className="flex-1 text-sm resize-none min-h-[38px] max-h-[100px]"
          rows={1}
        />
        <Button
          type="submit"
          variant="primary"
          disabled={!content.trim() || loading}
          className="shrink-0 h-[38px]"
        >
          {loading ? "..." : "Post"}
        </Button>
      </form>
    </div>
  )
}
