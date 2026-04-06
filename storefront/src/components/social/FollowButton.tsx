"use client"

import { useState, useEffect } from "react"

type FollowButtonProps = {
  sellerId: string
  sellerName?: string
}

const STORAGE_KEY = "vintify_following"
const COOKIE_KEY = "vintify_following"
const COOKIE_MAX_DAYS = 365

function getFollowedSellers(): Set<string> {
  if (typeof window === "undefined") return new Set()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return new Set(stored ? (JSON.parse(stored) as string[]) : [])
  } catch {
    return new Set()
  }
}

function saveFollowedSellers(ids: Set<string>): void {
  const arr = Array.from(ids)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr))
  } catch {
  }
  try {
    const expires = new Date(Date.now() + COOKIE_MAX_DAYS * 864e5).toUTCString()
    document.cookie = `${COOKIE_KEY}=${encodeURIComponent(JSON.stringify(arr))}; path=/; expires=${expires}; SameSite=Lax`
  } catch {
  }
}

export function FollowButton({ sellerId, sellerName }: FollowButtonProps) {
  const [following, setFollowing] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setFollowing(getFollowedSellers().has(sellerId))
  }, [sellerId])

  const handleToggle = () => {
    const ids = getFollowedSellers()
    if (following) {
      ids.delete(sellerId)
    } else {
      ids.add(sellerId)
    }
    saveFollowedSellers(ids)
    setFollowing(!following)
  }

  if (!mounted) {
    return (
      <button
        className="px-6 py-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-500 cursor-wait"
        disabled
      >
        Follow
      </button>
    )
  }

  return (
    <button
      onClick={handleToggle}
      className={`px-6 py-2 rounded-lg text-sm font-semibold transition-all duration-200 ${
        following
          ? "border border-gray-300 text-gray-700 hover:bg-gray-50"
          : "text-white hover:opacity-90"
      }`}
      style={following ? {} : { backgroundColor: "#09B1BA" }}
      aria-pressed={following}
    >
      {following ? "Following" : `Follow${sellerName ? ` ${sellerName}` : ""}`}
    </button>
  )
}
