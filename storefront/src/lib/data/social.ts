"use server"

import { sdk } from "../config"
import { getAuthHeaders } from "./cookies"

export type SocialPost = {
  id: string
  seller_id: string
  customer_id: string
  content: string
  image_url: string | null
  product_id: string | null
  author_name: string
  likes: number
  liked: boolean
  comment_count: number
  recent_comments: SocialComment[]
  created_at: string
}

export type SocialComment = {
  id: string
  post_id: string
  customer_id: string
  content: string
  author_name: string
  created_at: string
}

export type LikeState = {
  liked: boolean
  count: number
}

export const getFeed = async (page = 1, limit = 20, seller_id?: string): Promise<{ posts: SocialPost[]; count: number }> => {
  const authHeaders = await getAuthHeaders()
  const query: Record<string, string> = { page: String(page), limit: String(limit) }
  if (seller_id) query.seller_id = seller_id

  return sdk.client
    .fetch<{ posts: SocialPost[]; count: number }>(`/store/posts`, {
      query,
      headers: authHeaders as Record<string, string>,
      cache: "no-store",
    })
    .catch(() => ({ posts: [], count: 0 }))
}

export const getProductLikeState = async (productId: string): Promise<LikeState> => {
  const authHeaders = await getAuthHeaders()
  return sdk.client
    .fetch<LikeState>(`/store/products/${productId}/likes`, {
      headers: authHeaders as Record<string, string>,
      cache: "no-store",
    })
    .catch(() => ({ liked: false, count: 0 }))
}

export const getPostComments = async (postId: string): Promise<SocialComment[]> => {
  const authHeaders = await getAuthHeaders()
  return sdk.client
    .fetch<{ comments: SocialComment[] }>(`/store/posts/${postId}/comments`, {
      headers: authHeaders as Record<string, string>,
      cache: "no-store",
    })
    .then(r => r.comments)
    .catch(() => [])
}

export const createPost = async (data: {
  content: string
  image_url?: string | null
  product_id?: string | null
  seller_id?: string
}): Promise<SocialPost | null> => {
  const authHeaders = await getAuthHeaders()
  return sdk.client
    .fetch<{ post: SocialPost }>(`/store/posts`, {
      method: "POST",
      headers: authHeaders as Record<string, string>,
      body: data as Record<string, unknown>,
    })
    .then(r => r.post)
    .catch(() => null)
}
