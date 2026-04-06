"use client"

import { useState, useTransition, useRef } from "react"
import { usePathname } from "next/navigation"
import type { Comment } from "@/lib/data/social"

type CommentThreadProps = {
  postId: string
  initialComments: Comment[]
  initialTotal: number
  onSubmit: (postId: string, body: string) => Promise<Comment | null>
  onLoadMore: (postId: string, offset: number) => Promise<{ comments: Comment[] }>
  isAuthenticated: boolean
}

export function CommentThread({
  postId,
  initialComments,
  initialTotal,
  onSubmit,
  onLoadMore,
  isAuthenticated,
}: CommentThreadProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments)
  const [total, setTotal] = useState(initialTotal)
  const [open, setOpen] = useState(false)
  const [body, setBody] = useState("")
  const [isPending, startTransition] = useTransition()
  const [isLoading, setIsLoading] = useState(false)
  const [fetched, setFetched] = useState(initialComments.length > 0)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const pathname = usePathname()
  const locale = pathname.split("/")[1] || ""
  const loginHref = locale ? `/${locale}/user` : "/user"

  const handleOpen = () => {
    const next = !open
    setOpen(next)
    if (next && !fetched) {
      setIsLoading(true)
      onLoadMore(postId, 0)
        .then(({ comments: fetched_comments }) => {
          setComments(fetched_comments)
          setFetched(true)
        })
        .finally(() => setIsLoading(false))
    }
  }

  const handleLoadMore = () => {
    setIsLoading(true)
    onLoadMore(postId, comments.length)
      .then(({ comments: more }) => {
        setComments((prev) => [...prev, ...more])
      })
      .finally(() => setIsLoading(false))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim() || isPending) return

    const optimistic: Comment = {
      id: `temp-${Date.now()}`,
      post_id: postId,
      customer_id: "me",
      body: body.trim(),
      created_at: new Date().toISOString(),
    }

    setComments((prev) => [...prev, optimistic])
    setTotal((t) => t + 1)
    const submittedBody = body.trim()
    setBody("")

    startTransition(async () => {
      const result = await onSubmit(postId, submittedBody)
      if (result) {
        setComments((prev) =>
          prev.map((c) => (c.id === optimistic.id ? result : c))
        )
      } else {
        setComments((prev) => prev.filter((c) => c.id !== optimistic.id))
        setTotal((t) => Math.max(0, t - 1))
      }
    })
  }

  return (
    <div className="mt-2">
      <button
        onClick={handleOpen}
        className="flex items-center gap-1.5 text-gray-500 hover:text-gray-700 transition-colors"
        aria-expanded={open}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
        </svg>
        <span className="text-sm font-medium">{total}</span>
      </button>

      {open && (
        <div className="mt-3 space-y-3">
          {isLoading && comments.length === 0 && (
            <div className="flex justify-center py-4">
              <svg className="animate-spin w-5 h-5 text-teal-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          )}

          {comments.length > 0 && (
            <ul className="space-y-2">
              {comments.map((c) => (
                <li key={c.id} className="flex gap-2 text-sm">
                  <div className="w-7 h-7 rounded-full bg-teal-100 flex-shrink-0 flex items-center justify-center text-teal-700 font-semibold text-xs">
                    {c.customer_id === "me" ? "Me" : "U"}
                  </div>
                  <div className="flex-1 bg-gray-50 rounded-lg px-3 py-2">
                    <p className="text-gray-800">{c.body}</p>
                    <time className="text-xs text-gray-400 mt-0.5 block">
                      {new Date(c.created_at).toLocaleDateString()}
                    </time>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!isLoading && fetched && comments.length < total && (
            <button
              onClick={handleLoadMore}
              className="text-sm text-teal-600 hover:underline font-medium"
            >
              Load more comments ({total - comments.length} remaining)
            </button>
          )}

          {isAuthenticated ? (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <textarea
                ref={inputRef}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write a comment..."
                rows={2}
                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder-gray-400"
                maxLength={1000}
              />
              <button
                type="submit"
                disabled={!body.trim() || isPending}
                className="self-end px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-50"
                style={{ backgroundColor: "#09B1BA" }}
              >
                {isPending ? "..." : "Post"}
              </button>
            </form>
          ) : (
            <p className="text-sm text-gray-500">
              <a href={loginHref} className="text-teal-600 font-medium hover:underline">Sign in</a> to comment
            </p>
          )}
        </div>
      )}
    </div>
  )
}
