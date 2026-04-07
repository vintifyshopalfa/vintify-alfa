"use client"

import { useState } from "react"
import { HeartIcon, HeartFilledIcon } from "@/icons"

type LikeButtonProps = {
  resourceType: "product" | "post"
  resourceId: string
  initialLiked?: boolean
  initialCount?: number
  size?: "sm" | "md"
}

export const LikeButton = ({
  resourceType,
  resourceId,
  initialLiked = false,
  initialCount = 0,
  size = "md",
}: LikeButtonProps) => {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [loading, setLoading] = useState(false)

  const handleToggle = async () => {
    if (loading) return
    setLoading(true)

    const optimisticLiked = !liked
    const optimisticCount = optimisticLiked ? count + 1 : Math.max(0, count - 1)
    setLiked(optimisticLiked)
    setCount(optimisticCount)

    try {
      const endpoint =
        resourceType === "product"
          ? `/store/products/${resourceId}/likes`
          : `/store/posts/${resourceId}/likes`

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"}${endpoint}`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
          },
        }
      )

      if (res.ok) {
        const data = await res.json()
        setLiked(data.liked)
        setCount(data.count)
      } else if (res.status === 401) {
        setLiked(liked)
        setCount(count)
        window.location.href = "/account"
      } else {
        setLiked(liked)
        setCount(count)
      }
    } catch {
      setLiked(liked)
      setCount(count)
    } finally {
      setLoading(false)
    }
  }

  const iconSize = size === "sm" ? 16 : 20

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      aria-label={liked ? "Unlike" : "Like"}
      className={`flex items-center gap-1.5 transition-colors ${
        liked
          ? "text-red-500"
          : "text-neutral-400 hover:text-red-400"
      } ${loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      {liked ? (
        <HeartFilledIcon size={iconSize} color="#ef4444" />
      ) : (
        <HeartIcon size={iconSize} color="currentColor" />
      )}
      {count > 0 && (
        <span className={`font-medium ${size === "sm" ? "text-xs" : "text-sm"}`}>
          {count}
        </span>
      )}
    </button>
  )
}
