"use server"

import { sdk } from "../config"
import { cookies } from "next/headers"

export type Post = {
  id: string
  seller_id: string
  body: string
  images: string[]
  likes_count: number
  comments_count: number
  created_at: string
  updated_at: string
}

export type Comment = {
  id: string
  post_id: string
  customer_id: string
  body: string
  created_at: string
}

export type LikeResult = {
  liked: boolean
  count: number
}

async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies()
  return cookieStore.get("_medusa_jwt")?.value
}

export const getFeed = async (
  offset = 0,
  limit = 20
): Promise<{ posts: Post[]; count: number }> => {
  return sdk.client
    .fetch<{ posts: Post[]; count: number }>("/store/posts", {
      query: { offset: String(offset), limit: String(limit) },
      cache: "no-cache",
    })
    .catch(() => ({ posts: [], count: 0 }))
}

export const createPost = async (
  body: string,
  images: string[] = []
): Promise<Post | null> => {
  const token = await getAuthToken()
  if (!token) return null

  return sdk.client
    .fetch<{ post: Post }>("/store/posts", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { body, images },
      cache: "no-cache",
    })
    .then(({ post }) => post)
    .catch(() => null)
}

export const togglePostLike = async (postId: string): Promise<LikeResult | null> => {
  const token = await getAuthToken()
  if (!token) return null

  return sdk.client
    .fetch<LikeResult>(`/store/posts/${postId}/likes`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-cache",
    })
    .catch(() => null)
}

export const getPostComments = async (
  postId: string,
  offset = 0,
  limit = 20
): Promise<{ comments: Comment[] }> => {
  return sdk.client
    .fetch<{ comments: Comment[] }>(`/store/posts/${postId}/comments`, {
      query: { offset: String(offset), limit: String(limit) },
      cache: "no-cache",
    })
    .catch(() => ({ comments: [] }))
}

export const createComment = async (
  postId: string,
  body: string
): Promise<Comment | null> => {
  const token = await getAuthToken()
  if (!token) return null

  return sdk.client
    .fetch<{ comment: Comment }>(`/store/posts/${postId}/comments`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: { body },
      cache: "no-cache",
    })
    .then(({ comment }) => comment)
    .catch(() => null)
}

export const getProductLikes = async (
  productId: string,
  customerId?: string
): Promise<LikeResult> => {
  const token = await getAuthToken()
  return sdk.client
    .fetch<LikeResult>(`/store/products/${productId}/likes`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-cache",
    })
    .catch(() => ({ liked: false, count: 0 }))
}

export const toggleProductLike = async (productId: string): Promise<LikeResult | null> => {
  const token = await getAuthToken()
  if (!token) return null

  return sdk.client
    .fetch<LikeResult>(`/store/products/${productId}/likes`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-cache",
    })
    .catch(() => null)
}
