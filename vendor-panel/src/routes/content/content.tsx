import { useState } from "react"
import { useForm } from "react-hook-form"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Text,
  Textarea,
  toast,
  DropdownMenu,
  IconButton,
} from "@medusajs/ui"
import {
  EllipsisHorizontal,
  PencilSquare,
  Trash,
  PaperAirplane,
  ArrowPath,
  ChartBar,
  Photo,
  Clock,
  CheckCircleSolid,
  XCircleSolid,
} from "@medusajs/icons"
import {
  useCmsPosts,
  useCreateCmsPost,
  useDeleteCmsPost,
  usePublishCmsPost,
  useCmsPostMetrics,
  CmsPost,
  CmsChannel,
} from "../../hooks/api/cms"
import { fetchQuery } from "../../lib/client"

const STATUS_COLORS: Record<string, "grey" | "blue" | "green" | "orange" | "red"> = {
  draft: "grey",
  scheduled: "blue",
  published: "green",
  failed: "red",
}

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  published: "Published",
  failed: "Failed",
}

const CHANNEL_LABELS: Record<string, string> = {
  vintify: "Vintify Feed",
  instagram: "Instagram",
  facebook: "Facebook",
}

type PostFormData = {
  content: string
  media_url: string
  scheduled_at: string
  channels: Record<CmsChannel, boolean>
}

function getPublishErrorMessage(error: unknown): string {
  const msg =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message?: unknown }).message || "")
      : ""

  const normalized = msg.toLowerCase()
  if (normalized.includes("meta") && normalized.includes("disconnect")) {
    return "Conta Meta desconectada — clique em Settings para reconectar."
  }

  if (normalized.includes("rate") || normalized.includes("limit")) {
    return "Erro temporário da Meta — tente novamente em 5 minutos."
  }

  return msg || "Falha ao publicar. O conteúdo foi mantido como rascunho para nova tentativa."
}

function MetricsModal({ post, onClose }: { post: CmsPost; onClose: () => void }) {
  const { metrics, isPending } = useCmsPostMetrics(post.id)

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <Heading level="h3">Post Metrics</Heading>
          <Button variant="transparent" onClick={onClose} size="small">
            Close
          </Button>
        </div>
        {isPending ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-ui-bg-subtle rounded animate-pulse" />)}
          </div>
        ) : metrics ? (
          <div className="space-y-3">
            <Text size="small" className="text-ui-fg-subtle">
              Published: {post.published_at ? new Date(post.published_at).toLocaleString() : "—"}
            </Text>
            {metrics.instagram && (
              <div className="p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100">
                <Text weight="plus" className="text-sm mb-2">Instagram</Text>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(metrics.instagram as Record<string, number>).map(([key, val]) => (
                    <div key={key} className="text-center">
                      <Text className="text-lg font-bold">{val}</Text>
                      <Text size="xsmall" className="text-ui-fg-muted capitalize">{key}</Text>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {metrics.facebook && (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <Text weight="plus" className="text-sm mb-1">Facebook</Text>
                <Text size="small" className="text-ui-fg-subtle">
                  Post ID: {(metrics.facebook as Record<string, string>).post_id}
                </Text>
              </div>
            )}
            {metrics.vintify && (
              <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
                <Text weight="plus" className="text-sm mb-1">Vintify Feed</Text>
                <Text size="small" className="text-ui-fg-subtle">
                  Post ID: {(metrics.vintify as Record<string, string>).post_id}
                </Text>
              </div>
            )}
            {!metrics.instagram && !metrics.facebook && !metrics.vintify && (
              <Text className="text-ui-fg-subtle text-center py-4">
                No metrics available yet
              </Text>
            )}
          </div>
        ) : (
          <Text className="text-ui-fg-subtle">Failed to load metrics</Text>
        )}
      </div>
    </div>
  )
}

function PostCard({ post }: { post: CmsPost }) {
  const [showMetrics, setShowMetrics] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const { mutateAsync: deletePost } = useDeleteCmsPost()
  const { mutateAsync: publish } = usePublishCmsPost(post.id)

  const handlePublish = async () => {
    setPublishing(true)
    try {
      const channels = (post.published_channels?.length ? post.published_channels : ["vintify"]) as CmsChannel[]
      const result = await publish({ channels })
      toast.success(result.warnings
        ? `Published with warnings: ${result.warnings}`
        : `Published to ${result.channels?.join(", ")}`)
    } catch (e: any) {
      toast.error(getPublishErrorMessage(e))
    } finally {
      setPublishing(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm("Delete this post?")) return
    try {
      await deletePost(post.id)
      toast.success("Post deleted")
    } catch (e: any) {
      toast.error(e.message || "Failed to delete")
    }
  }

  return (
    <Container className="p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge color={STATUS_COLORS[post.status] ?? "grey"} size="2xsmall">
            {STATUS_LABELS[post.status] ?? post.status}
          </Badge>
          {(post.published_channels || []).map(ch => (
            <Badge key={ch} color="blue" size="2xsmall">{CHANNEL_LABELS[ch] || ch}</Badge>
          ))}
        </div>
        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <IconButton variant="transparent" size="small">
              <EllipsisHorizontal />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content>
            {post.status !== "published" && (
              <DropdownMenu.Item onClick={handlePublish} disabled={publishing}>
                <PaperAirplane className="mr-2" />
                Publish Now
              </DropdownMenu.Item>
            )}
            {post.status === "published" && (
              <DropdownMenu.Item onClick={() => setShowMetrics(true)}>
                <ChartBar className="mr-2" />
                View Metrics
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Separator />
            <DropdownMenu.Item onClick={handleDelete} className="text-ui-fg-error">
              <Trash className="mr-2" />
              Delete
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu>
      </div>

      <Text className="text-ui-fg-base whitespace-pre-line">{post.content}</Text>

      {(post.media_urls || []).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(post.media_urls).map((url, i) => (
            <img key={i} src={url} alt="media" className="w-20 h-20 object-cover rounded-lg border border-ui-border-base" />
          ))}
        </div>
      )}

      <div className="flex items-center gap-4 mt-1">
        <Text size="xsmall" className="text-ui-fg-muted">
          Created: {new Date(post.created_at).toLocaleDateString()}
        </Text>
        {post.scheduled_at && post.status === "scheduled" && (
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-ui-fg-muted" />
            <Text size="xsmall" className="text-ui-fg-muted">
              {new Date(post.scheduled_at).toLocaleString()}
            </Text>
          </div>
        )}
        {post.status === "failed" && post.failure_reason && (
          <div className="flex items-center gap-1">
            <XCircleSolid className="w-3 h-3 text-ui-fg-error" />
            <Text size="xsmall" className="text-ui-fg-error">{post.failure_reason}</Text>
          </div>
        )}
        {post.status === "published" && (
          <div className="flex items-center gap-1">
            <CheckCircleSolid className="w-3 h-3 text-green-600" />
            <Text size="xsmall" className="text-green-600">
              {post.published_at ? new Date(post.published_at).toLocaleString() : "Published"}
            </Text>
          </div>
        )}
      </div>

      {showMetrics && <MetricsModal post={post} onClose={() => setShowMetrics(false)} />}
    </Container>
  )
}

export const Content = () => {
  const [activeTab, setActiveTab] = useState<"all" | "draft" | "scheduled" | "published">("all")
  const [showForm, setShowForm] = useState(false)

  const statusFilter = activeTab === "all" ? undefined : activeTab
  const { posts, isPending, refetch } = useCmsPosts(statusFilter ? { status: statusFilter as any } : undefined)
  const { mutateAsync: createPost, isPending: isCreating } = useCreateCmsPost()

  const { register, handleSubmit, reset, watch, setValue } = useForm<PostFormData>({
    defaultValues: {
      content: "",
      media_url: "",
      scheduled_at: "",
      channels: { vintify: true, instagram: false, facebook: false },
    },
  })

  const scheduledAt = watch("scheduled_at")
  const channels = watch("channels")

  const onSubmit = async (data: PostFormData) => {
    const selectedChannels = (Object.entries(data.channels)
      .filter(([, v]) => v)
      .map(([k]) => k)) as CmsChannel[]

    if (selectedChannels.length === 0) {
      toast.error("Select at least one publishing channel")
      return
    }

    try {
      const mediaUrls = data.media_url.trim() ? [data.media_url.trim()] : []
      const isScheduled = !!data.scheduled_at
      const result = await createPost({
        content: data.content,
        media_urls: mediaUrls,
        status: isScheduled ? "scheduled" : "draft",
        published_channels: selectedChannels,
        scheduled_at: isScheduled ? new Date(data.scheduled_at).toISOString() : null,
      })

      if (!isScheduled) {
        try {
          await fetchQuery(`/vendor/cms/posts/${result.post.id}/publish`, {
            method: "POST",
            body: { channels: selectedChannels },
          })
          toast.success("Post created and published!")
        } catch (e: any) {
          toast.warning(getPublishErrorMessage(e))
          toast.success("Draft saved — publish it manually from the list.")
        }
      } else {
        toast.success(isScheduled ? "Post scheduled!" : "Draft saved!")
      }

      reset()
      setShowForm(false)
      refetch()
    } catch (e: any) {
      toast.error(e.message || "Failed to create post")
    }
  }

  const tabs = [
    { id: "all" as const, label: "All Posts" },
    { id: "draft" as const, label: "Drafts" },
    { id: "scheduled" as const, label: "Scheduled" },
    { id: "published" as const, label: "Published" },
  ]

  return (
    <div className="flex flex-col gap-6 px-6 py-8 max-w-[900px]">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h1">Content</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Create and publish posts to Vintify, Instagram, and Facebook
          </Text>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => window.location.href = "/content/settings"} size="small">
            Settings
          </Button>
          <Button onClick={() => setShowForm(!showForm)}>
            {showForm ? "Cancel" : "New Post"}
          </Button>
        </div>
      </div>

      {showForm && (
        <Container className="p-6">
          <Heading level="h3" className="mb-4">Create Post</Heading>
          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <div>
              <Label className="mb-1.5 block">Content</Label>
              <Textarea
                placeholder="Write your post content..."
                rows={5}
                {...register("content", { required: true })}
              />
            </div>

            <div>
              <Label className="mb-1.5 block">
                <div className="flex items-center gap-1.5">
                  <Photo className="w-4 h-4" />
                  Image URL (optional)
                </div>
              </Label>
              <Input
                placeholder="https://example.com/image.jpg"
                {...register("media_url")}
              />
              <Text size="xsmall" className="text-ui-fg-muted mt-1">
                Required for Instagram posts
              </Text>
            </div>

            <div>
              <Label className="mb-2 block">Publish Channels</Label>
              <div className="flex flex-wrap gap-3">
                {(["vintify", "instagram", "facebook"] as CmsChannel[]).map(channel => (
                  <label key={channel} className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      className="rounded"
                      checked={channels[channel]}
                      onChange={e => setValue(`channels.${channel}`, e.target.checked)}
                    />
                    <span className="text-sm">{CHANNEL_LABELS[channel]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  Schedule for later (optional)
                </div>
              </Label>
              <Input
                type="datetime-local"
                {...register("scheduled_at")}
              />
              <Text size="xsmall" className="text-ui-fg-muted mt-1">
                Leave empty to publish immediately (or save as draft)
              </Text>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="secondary" type="button" onClick={() => { reset(); setShowForm(false) }}>
                Cancel
              </Button>
              <Button type="submit" isLoading={isCreating}>
                {scheduledAt ? "Schedule Post" : "Publish Now"}
              </Button>
            </div>
          </form>
        </Container>
      )}

      <div className="flex gap-2 border-b border-ui-border-base">
        {tabs.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.id
                ? "border-ui-fg-interactive text-ui-fg-interactive"
                : "border-transparent text-ui-fg-subtle hover:text-ui-fg-base"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-ui-bg-subtle rounded-xl animate-pulse" />
          ))}
        </div>
      ) : posts.length === 0 ? (
        <Container className="p-8 text-center">
          <PencilSquare className="w-8 h-8 text-ui-fg-muted mx-auto mb-3" />
          <Text className="text-ui-fg-subtle">No posts yet. Create your first content post!</Text>
        </Container>
      ) : (
        <div className="flex flex-col gap-3">
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  )
}
