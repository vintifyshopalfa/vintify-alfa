"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

type LikeButtonProps = {
  initialLiked: boolean
  initialCount: number
  onToggle: () => Promise<{ liked: boolean; count: number } | null>
  isAuthenticated?: boolean
  size?: "sm" | "md"
}

export function LikeButton({
  initialLiked,
  initialCount,
  onToggle,
  isAuthenticated = false,
  size = "md",
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleClick = () => {
    if (isPending) return

    if (!isAuthenticated) {
      router.push("/user")
      return
    }

    const prevLiked = liked
    const prevCount = count
    setLiked(!liked)
    setCount(liked ? Math.max(0, count - 1) : count + 1)

    startTransition(async () => {
      const result = await onToggle()
      if (!result) {
        setLiked(prevLiked)
        setCount(prevCount)
      } else {
        setLiked(result.liked)
        setCount(result.count)
      }
    })
  }

  const iconSize = size === "sm" ? "w-4 h-4" : "w-5 h-5"
  const textSize = size === "sm" ? "text-xs" : "text-sm"

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      aria-label={liked ? "Unlike" : "Like"}
      title={!isAuthenticated ? "Sign in to like" : undefined}
      className={`flex items-center gap-1.5 transition-all duration-150 ${
        liked
          ? "text-red-500"
          : "text-gray-500 hover:text-red-400"
      } ${isPending ? "opacity-60" : ""}`}
    >
      <svg
        className={iconSize}
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
      <span className={`font-medium ${textSize}`}>{count}</span>
    </button>
  )
}
