"use client"

import { useEffect, useState } from "react"
import { getProductComments, createProductComment } from "@/lib/data/social"
import type { Comment } from "@/lib/data/social"

const PAGE_SIZE = 10

export const ProductCommentsSection = ({ productId, isAuthenticated }: { productId: string; isAuthenticated: boolean }) => {
  const [comments, setComments] = useState<Comment[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [body, setBody] = useState("")
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    setLoading(true)
    getProductComments(productId, 0, PAGE_SIZE)
      .then(({ comments: c, total: t }) => {
        setComments(c)
        setTotal(t as number)
        setOffset(PAGE_SIZE)
      })
      .finally(() => setLoading(false))
  }, [productId])

  const loadMore = async () => {
    const { comments: more } = await getProductComments(productId, offset, PAGE_SIZE)
    setComments((prev) => [...prev, ...more])
    setOffset((o) => o + PAGE_SIZE)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!body.trim() || submitting) return
    setSubmitting(true)
    const comment = await createProductComment(productId, body.trim())
    if (comment) {
      setComments((prev) => [...prev, comment])
      setTotal((t) => t + 1)
      setBody("")
    }
    setSubmitting(false)
  }

  const pathname = typeof window !== "undefined" ? window.location.pathname : ""
  const locale = pathname.split("/")[1] || ""
  const loginHref = locale ? `/${locale}/user` : "/user"

  return (
    <div className="border rounded-sm p-4 mt-3">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Questions &amp; Comments ({total})</h3>

      {loading ? (
        <p className="text-sm text-gray-500">Loading comments…</p>
      ) : (
        <>
          <ul className="space-y-2 mb-3">
            {comments.map((c) => (
              <li key={c.id} className="text-sm text-gray-800 bg-gray-50 rounded p-2">
                {c.body}
              </li>
            ))}
          </ul>
          {comments.length < total && (
            <button
              onClick={loadMore}
              className="text-sm text-teal-600 hover:underline mb-3"
            >
              Load more ({total - comments.length} remaining)
            </button>
          )}
        </>
      )}

      {isAuthenticated ? (
        <form onSubmit={submit} className="flex gap-2">
          <input
            type="text"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Add a comment…"
            className="flex-1 text-sm border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="text-sm px-3 py-1 rounded text-white disabled:opacity-50"
            style={{ backgroundColor: "#09B1BA" }}
          >
            {submitting ? "Posting…" : "Post"}
          </button>
        </form>
      ) : (
        <p className="text-sm text-gray-500">
          <a href={loginHref} className="text-teal-600 font-medium hover:underline">Sign in</a> to comment
        </p>
      )}
    </div>
  )
}
