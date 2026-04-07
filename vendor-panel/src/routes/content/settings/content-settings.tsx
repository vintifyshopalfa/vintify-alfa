import { useState, useEffect } from "react"
import { useSearchParams } from "react-router-dom"
import { useForm } from "react-hook-form"
import {
  Badge,
  Button,
  Container,
  Heading,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui"
import {
  CheckCircleSolid,
  XCircleSolid,
  InformationCircleSolid,
} from "@medusajs/icons"
import { useMetaStatus, useConnectMeta } from "../../../hooks/api/cms"
import { fetchQuery } from "../../../lib/client"

type InstagramForm = {
  access_token: string
  user_id: string
  username: string
}

type FacebookForm = {
  access_token: string
  page_id: string
  page_name: string
}

function PlatformCard({
  title,
  connected,
  accountInfo,
  children,
}: {
  title: string
  connected: boolean
  accountInfo?: string | null
  children: React.ReactNode
}) {
  return (
    <Container className="p-0 divide-y divide-ui-border-base">
      <div className="flex items-center justify-between px-6 py-4">
        <Heading level="h2">{title}</Heading>
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <CheckCircleSolid className="text-green-600 w-4 h-4" />
              <Badge color="green" size="2xsmall">Connected</Badge>
              {accountInfo && (
                <Text size="xsmall" className="text-ui-fg-muted">{accountInfo}</Text>
              )}
            </>
          ) : (
            <>
              <XCircleSolid className="text-ui-fg-muted w-4 h-4" />
              <Badge color="grey" size="2xsmall">Not connected</Badge>
            </>
          )}
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </Container>
  )
}

export const ContentSettings = () => {
  const [searchParams] = useSearchParams()
  const { status, isPending, refetch } = useMetaStatus()
  const { mutateAsync: connectMeta, isPending: isConnecting } = useConnectMeta()

  const igForm = useForm<InstagramForm>()
  const fbForm = useForm<FacebookForm>()

  useEffect(() => {
    const connected = searchParams.get("meta_connected")
    const error = searchParams.get("meta_error")
    if (connected === "true") {
      toast.success("Meta account connected successfully!")
      refetch()
    } else if (error) {
      toast.error(`OAuth failed: ${error.replace(/_/g, " ")}`)
    }
  }, [searchParams])

  const handleOAuth = async () => {
    try {
      const data = await fetchQuery("/vendor/meta/connect", { method: "GET" })
      if (data.oauth_url) {
        window.open(data.oauth_url, "_blank", "width=600,height=700")
      } else {
        toast.info(data.message || "Manual token entry required")
      }
    } catch (e: any) {
      toast.error("Failed to get OAuth URL")
    }
  }

  const onInstagramSubmit = async (data: InstagramForm) => {
    if (!data.access_token) return
    try {
      await connectMeta({
        platform: "instagram",
        access_token: data.access_token,
        user_id: data.user_id,
        username: data.username,
      })
      toast.success("Instagram connected!")
      igForm.reset()
      refetch()
    } catch (e: any) {
      toast.error(e.message || "Failed to connect Instagram")
    }
  }

  const onFacebookSubmit = async (data: FacebookForm) => {
    if (!data.access_token) return
    try {
      await connectMeta({
        platform: "facebook",
        access_token: data.access_token,
        page_id: data.page_id,
        page_name: data.page_name,
      })
      toast.success("Facebook connected!")
      fbForm.reset()
      refetch()
    } catch (e: any) {
      toast.error(e.message || "Failed to connect Facebook")
    }
  }

  if (isPending) {
    return (
      <div className="px-6 py-8 max-w-[900px]">
        <div className="h-8 w-48 bg-ui-bg-subtle rounded animate-pulse mb-4" />
        <div className="flex flex-col gap-4">
          {[1, 2].map(i => <div key={i} className="h-48 bg-ui-bg-subtle rounded-xl animate-pulse" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8 max-w-[900px]">
      <div className="flex items-center justify-between">
        <div>
          <Heading level="h1">Content Settings</Heading>
          <Text className="text-ui-fg-subtle mt-1">
            Connect your social media accounts to publish posts
          </Text>
        </div>
        <Button variant="secondary" onClick={() => window.location.href = "/content"} size="small">
          Back to Content
        </Button>
      </div>

      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
        <InformationCircleSolid className="text-blue-600 w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <Text weight="plus" className="text-sm text-blue-800 mb-1">
            How to connect your accounts
          </Text>
          <Text size="small" className="text-blue-700">
            Use the OAuth button to connect automatically, or enter your tokens manually. 
            For Instagram, you need an Instagram Business account and a connected Facebook App.
            Get access tokens from <strong>Meta Developers → Tools → Graph API Explorer</strong>.
          </Text>
        </div>
      </div>

      <PlatformCard
        title="Instagram Business"
        connected={status?.instagram.connected ?? false}
        accountInfo={status?.instagram.username ? `@${status.instagram.username}` : undefined}
      >
        <div className="flex flex-col gap-4">
          <Button variant="secondary" onClick={handleOAuth} type="button">
            Connect via Meta OAuth
          </Button>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 border-t border-ui-border-base" />
            <Text size="xsmall" className="text-ui-fg-muted">or enter manually</Text>
            <div className="flex-1 border-t border-ui-border-base" />
          </div>

          <form onSubmit={igForm.handleSubmit(onInstagramSubmit)} className="flex flex-col gap-3">
            <div>
              <Label className="mb-1.5 block">Instagram User ID</Label>
              <Input placeholder="e.g. 17841400000000000" {...igForm.register("user_id")} />
            </div>
            <div>
              <Label className="mb-1.5 block">Username</Label>
              <Input placeholder="e.g. myshop" {...igForm.register("username")} />
            </div>
            <div>
              <Label className="mb-1.5 block">Access Token</Label>
              <Input
                type="password"
                placeholder="Instagram access token"
                {...igForm.register("access_token", { required: true })}
              />
              <Text size="xsmall" className="text-ui-fg-muted mt-1">
                Needs <code>instagram_basic</code> and <code>instagram_content_publish</code> permissions
              </Text>
            </div>
            <Button type="submit" isLoading={isConnecting} size="small" className="self-start">
              Save Instagram Token
            </Button>
          </form>
        </div>
      </PlatformCard>

      <PlatformCard
        title="Facebook Page"
        connected={status?.facebook.connected ?? false}
        accountInfo={status?.facebook.page_name ?? undefined}
      >
        <div className="flex flex-col gap-4">
          <Button variant="secondary" onClick={handleOAuth} type="button">
            Connect via Meta OAuth
          </Button>

          <div className="relative flex items-center gap-3">
            <div className="flex-1 border-t border-ui-border-base" />
            <Text size="xsmall" className="text-ui-fg-muted">or enter manually</Text>
            <div className="flex-1 border-t border-ui-border-base" />
          </div>

          <form onSubmit={fbForm.handleSubmit(onFacebookSubmit)} className="flex flex-col gap-3">
            <div>
              <Label className="mb-1.5 block">Page ID</Label>
              <Input placeholder="e.g. 123456789" {...fbForm.register("page_id")} />
            </div>
            <div>
              <Label className="mb-1.5 block">Page Name</Label>
              <Input placeholder="e.g. My Store" {...fbForm.register("page_name")} />
            </div>
            <div>
              <Label className="mb-1.5 block">Page Access Token</Label>
              <Input
                type="password"
                placeholder="Facebook page access token"
                {...fbForm.register("access_token", { required: true })}
              />
              <Text size="xsmall" className="text-ui-fg-muted mt-1">
                Needs <code>pages_manage_posts</code> permission
              </Text>
            </div>
            <Button type="submit" isLoading={isConnecting} size="small" className="self-start">
              Save Facebook Token
            </Button>
          </form>
        </div>
      </PlatformCard>
    </div>
  )
}
