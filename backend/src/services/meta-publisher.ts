export interface MetaPublishResult {
  instagram_post_id?: string
  facebook_post_id?: string
  error?: string
}

export interface MetaPublishOptions {
  content: string
  media_url?: string
  instagram_user_id?: string
  instagram_access_token?: string
  facebook_page_id?: string
  facebook_access_token?: string
  channels: string[]
}

const META_GRAPH_VERSION = "v18.0"
const META_GRAPH_BASE = `https://graph.facebook.com/${META_GRAPH_VERSION}`

async function graphPost(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const url = `${META_GRAPH_BASE}${path}`
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  })
  const data = await response.json() as Record<string, unknown>
  if (!response.ok) {
    const err = (data.error as Record<string, unknown>) || {}
    throw new Error(String(err.message || `Graph API error: ${response.status}`))
  }
  return data
}

async function graphGet(path: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  const qs = new URLSearchParams(params).toString()
  const url = `${META_GRAPH_BASE}${path}?${qs}`
  const response = await fetch(url)
  const data = await response.json() as Record<string, unknown>
  if (!response.ok) {
    const err = (data.error as Record<string, unknown>) || {}
    throw new Error(String(err.message || `Graph API error: ${response.status}`))
  }
  return data
}

export async function publishToInstagram(
  igUserId: string,
  accessToken: string,
  caption: string,
  imageUrl?: string
): Promise<string> {
  if (!imageUrl) {
    throw new Error("Instagram requires an image URL for feed posts")
  }

  const containerData = await graphPost(`/${igUserId}/media`, {
    image_url: imageUrl,
    caption,
    access_token: accessToken,
  })
  const containerId = containerData.id as string

  const publishData = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: containerId,
    access_token: accessToken,
  })
  return publishData.id as string
}

export async function publishToFacebook(
  pageId: string,
  accessToken: string,
  message: string,
  imageUrl?: string
): Promise<string> {
  if (imageUrl) {
    const data = await graphPost(`/${pageId}/photos`, {
      url: imageUrl,
      caption: message,
      access_token: accessToken,
      published: "true",
    })
    return (data.post_id || data.id) as string
  }

  const data = await graphPost(`/${pageId}/feed`, {
    message,
    access_token: accessToken,
  })
  return data.id as string
}

export async function getInstagramInsights(
  mediaId: string,
  accessToken: string
): Promise<{ likes: number; impressions: number; reach: number; comments: number }> {
  try {
    const data = await graphGet(`/${mediaId}/insights`, {
      metric: "impressions,reach",
      access_token: accessToken,
    })
    const metricData = (data.data as Array<{ name: string; values: Array<{ value: number }> }>) || []
    const getMetric = (name: string) => {
      const m = metricData.find((d) => d.name === name)
      return m?.values?.[0]?.value ?? 0
    }

    const basicData = await graphGet(`/${mediaId}`, {
      fields: "like_count,comments_count",
      access_token: accessToken,
    })

    return {
      likes: (basicData.like_count as number) ?? 0,
      impressions: getMetric("impressions"),
      reach: getMetric("reach"),
      comments: (basicData.comments_count as number) ?? 0,
    }
  } catch {
    return { likes: 0, impressions: 0, reach: 0, comments: 0 }
  }
}

export async function publishPost(options: MetaPublishOptions): Promise<MetaPublishResult> {
  const result: MetaPublishResult = {}
  const errors: string[] = []

  if (
    options.channels.includes("instagram") &&
    options.instagram_user_id &&
    options.instagram_access_token
  ) {
    try {
      result.instagram_post_id = await publishToInstagram(
        options.instagram_user_id,
        options.instagram_access_token,
        options.content,
        options.media_url
      )
    } catch (e) {
      errors.push(`Instagram: ${(e as Error).message}`)
    }
  }

  if (
    options.channels.includes("facebook") &&
    options.facebook_page_id &&
    options.facebook_access_token
  ) {
    try {
      result.facebook_post_id = await publishToFacebook(
        options.facebook_page_id,
        options.facebook_access_token,
        options.content,
        options.media_url
      )
    } catch (e) {
      errors.push(`Facebook: ${(e as Error).message}`)
    }
  }

  if (errors.length > 0) {
    result.error = errors.join("; ")
  }

  return result
}
