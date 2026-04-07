import { useMutation, UseMutationOptions, useQuery, UseQueryOptions, QueryKey } from "@tanstack/react-query"
import { FetchError } from "@medusajs/js-sdk"
import { fetchQuery } from "../../lib/client"
import { queryClient } from "../../lib/query-client"
import { queryKeysFactory } from "../../lib/query-key-factory"

const CMS_QUERY_KEY = "cms" as const
export const cmsQueryKeys = queryKeysFactory(CMS_QUERY_KEY)

export type CmsPostStatus = "draft" | "scheduled" | "published" | "failed"
export type CmsChannel = "vintify" | "instagram" | "facebook"

export interface CmsPost {
  id: string
  seller_id: string
  content: string
  media_urls: string[]
  status: CmsPostStatus
  published_channels: CmsChannel[]
  scheduled_at: string | null
  published_at: string | null
  external_post_ids: Record<string, string>
  failure_reason: string | null
  created_at: string
  updated_at: string
}

export interface MetaStatus {
  instagram: { connected: boolean; user_id: string | null; username: string | null }
  facebook: { connected: boolean; page_id: string | null; page_name: string | null }
}

export const useCmsPosts = (
  query?: { status?: CmsPostStatus },
  options?: Omit<UseQueryOptions<{ posts: CmsPost[]; count: number }, FetchError, { posts: CmsPost[]; count: number }, QueryKey>, "queryFn" | "queryKey">
) => {
  const { data, ...rest } = useQuery({
    queryKey: [...cmsQueryKeys.lists(), query],
    queryFn: () =>
      fetchQuery("/vendor/cms/posts", {
        method: "GET",
        query: query as Record<string, string>,
      }),
    ...options,
  })
  return { posts: data?.posts ?? [], count: data?.count ?? 0, ...rest }
}

export const useCreateCmsPost = (
  options?: UseMutationOptions<{ post: CmsPost }, FetchError, Partial<CmsPost>>
) => {
  return useMutation({
    mutationFn: (payload) =>
      fetchQuery("/vendor/cms/posts", { method: "POST", body: payload }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: cmsQueryKeys.lists() })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useUpdateCmsPost = (
  id: string,
  options?: UseMutationOptions<{ post: CmsPost }, FetchError, Partial<CmsPost>>
) => {
  return useMutation({
    mutationFn: (payload) =>
      fetchQuery(`/vendor/cms/posts/${id}`, { method: "PATCH" as any, body: payload }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: cmsQueryKeys.lists() })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useDeleteCmsPost = (
  options?: UseMutationOptions<{ message: string }, FetchError, string>
) => {
  return useMutation({
    mutationFn: (id: string) =>
      fetchQuery(`/vendor/cms/posts/${id}`, { method: "DELETE" }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: cmsQueryKeys.lists() })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const usePublishCmsPost = (
  id: string,
  options?: UseMutationOptions<any, FetchError, { channels: CmsChannel[] }>
) => {
  return useMutation({
    mutationFn: (payload: { channels: CmsChannel[] }) =>
      fetchQuery(`/vendor/cms/posts/${id}/publish`, { method: "POST", body: payload }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: cmsQueryKeys.lists() })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}

export const useCmsPostMetrics = (
  id: string,
  options?: Omit<UseQueryOptions<any, FetchError, any, QueryKey>, "queryFn" | "queryKey">
) => {
  const { data, ...rest } = useQuery({
    queryKey: [...cmsQueryKeys.detail(id), "metrics"],
    queryFn: () => fetchQuery(`/vendor/cms/posts/${id}/metrics`, { method: "GET" }),
    ...options,
  })
  return { metrics: data?.metrics ?? null, ...rest }
}

export const useMetaStatus = (
  options?: Omit<UseQueryOptions<MetaStatus, FetchError, MetaStatus, QueryKey>, "queryFn" | "queryKey">
) => {
  const { data, ...rest } = useQuery({
    queryKey: [CMS_QUERY_KEY, "meta-status"],
    queryFn: () => fetchQuery("/vendor/meta/status", { method: "GET" }),
    ...options,
  })
  return { status: data ?? null, ...rest }
}

export const useConnectMeta = (
  options?: UseMutationOptions<any, FetchError, {
    platform: "instagram" | "facebook"
    access_token: string
    user_id?: string
    page_id?: string
    username?: string
    page_name?: string
  }>
) => {
  return useMutation({
    mutationFn: (payload) =>
      fetchQuery("/vendor/meta/connect", { method: "POST", body: payload }),
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({ queryKey: [CMS_QUERY_KEY, "meta-status"] })
      options?.onSuccess?.(data, variables, context)
    },
    ...options,
  })
}
