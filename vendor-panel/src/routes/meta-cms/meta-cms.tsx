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
} from "@medusajs/ui"
import {
  GlobeEurope,
  Photo,
  Tag,
  Newspaper,
  InformationCircleSolid,
} from "@medusajs/icons"
import { useMe, useUpdateMe } from "../../hooks/api"

type MetaForm = {
  facebook_pixel_id: string
  instagram_catalog_id: string
  meta_app_id: string
  meta_access_token: string
  store_announcement: string
  store_blog_title: string
  store_blog_content: string
}

function Section({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
}) {
  return (
    <Container className="p-0 divide-y divide-ui-border-base">
      <div className="flex items-start gap-3 px-6 py-5">
        <div className="p-2 bg-ui-bg-subtle rounded-lg shrink-0">
          <Icon className="w-5 h-5 text-ui-fg-subtle" />
        </div>
        <div>
          <Heading level="h2">{title}</Heading>
          <Text className="text-ui-fg-subtle text-sm mt-0.5">{description}</Text>
        </div>
      </div>
      <div className="px-6 py-5">{children}</div>
    </Container>
  )
}

export const MetaCms = () => {
  const { seller, isPending } = useMe()
  const { mutateAsync: updateSeller, isPending: isSaving } = useUpdateMe()
  const [activeTab, setActiveTab] = useState<"meta" | "cms">("meta")

  const metadata = (seller?.metadata as Record<string, string>) || {}

  const { register, handleSubmit, formState: { isDirty } } = useForm<MetaForm>({
    defaultValues: {
      facebook_pixel_id: metadata.facebook_pixel_id || "",
      instagram_catalog_id: metadata.instagram_catalog_id || "",
      meta_app_id: metadata.meta_app_id || "",
      meta_access_token: metadata.meta_access_token || "",
      store_announcement: metadata.store_announcement || "",
      store_blog_title: metadata.store_blog_title || "",
      store_blog_content: metadata.store_blog_content || "",
    },
  })

  const onSubmit = async (data: MetaForm) => {
    try {
      await updateSeller({
        metadata: {
          ...metadata,
          ...data,
          meta_updated_at: new Date().toISOString(),
        },
      })
      toast.success("Meta & CMS settings saved successfully!")
    } catch (e: any) {
      toast.error("Failed to save settings: " + e.message)
    }
  }

  if (isPending) {
    return (
      <div className="px-6 py-8">
        <div className="h-8 w-48 bg-ui-bg-subtle rounded animate-pulse mb-4" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-ui-bg-subtle rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  const tabs = [
    { id: "meta" as const, label: "Meta (Facebook & Instagram)" },
    { id: "cms" as const, label: "Store Content" },
  ]

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-6 px-6 py-8 max-w-[900px]">
        <div className="flex items-center justify-between">
          <div>
            <Heading level="h1">Meta & CMS</Heading>
            <Text className="text-ui-fg-subtle mt-1">
              Connect your Facebook/Instagram presence and manage your store content
            </Text>
          </div>
          <Button
            type="submit"
            isLoading={isSaving}
            disabled={!isDirty}
          >
            Save Changes
          </Button>
        </div>

        <div className="flex gap-2 border-b border-ui-border-base">
          {tabs.map((tab) => (
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

        {activeTab === "meta" && (
          <div className="flex flex-col gap-4">
            <Section
              title="Facebook Pixel"
              description="Track store visitors and conversions through Facebook Pixel to optimize your ad campaigns"
              icon={GlobeEurope}
            >
              <div className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="facebook_pixel_id" className="mb-1.5 block">
                    Pixel ID
                  </Label>
                  <Input
                    id="facebook_pixel_id"
                    placeholder="e.g. 1234567890123456"
                    {...register("facebook_pixel_id")}
                  />
                  <Text className="text-ui-fg-muted text-xs mt-1">
                    Find your Pixel ID in Facebook Events Manager → Data Sources
                  </Text>
                </div>
                <div>
                  <Label htmlFor="meta_app_id" className="mb-1.5 block">
                    Meta App ID
                  </Label>
                  <Input
                    id="meta_app_id"
                    placeholder="e.g. 987654321"
                    {...register("meta_app_id")}
                  />
                </div>
                <div>
                  <Label htmlFor="meta_access_token" className="mb-1.5 block">
                    System User Access Token
                  </Label>
                  <Input
                    id="meta_access_token"
                    type="password"
                    placeholder="Your Meta system user access token"
                    {...register("meta_access_token")}
                  />
                  <Text className="text-ui-fg-muted text-xs mt-1">
                    Required for Conversions API server-side tracking
                  </Text>
                </div>

                {metadata.facebook_pixel_id && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                    <InformationCircleSolid className="text-emerald-600 w-4 h-4 shrink-0" />
                    <Text className="text-sm text-emerald-700">
                      Facebook Pixel is active and tracking store events
                    </Text>
                    <Badge color="green" size="2xsmall" className="ml-auto">Active</Badge>
                  </div>
                )}
              </div>
            </Section>

            <Section
              title="Instagram Shopping Catalog"
              description="Sync your products with Instagram to allow customers to shop directly from your posts"
              icon={Photo}
            >
              <div className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="instagram_catalog_id" className="mb-1.5 block">
                    Instagram Catalog ID
                  </Label>
                  <Input
                    id="instagram_catalog_id"
                    placeholder="e.g. 1234567890"
                    {...register("instagram_catalog_id")}
                  />
                  <Text className="text-ui-fg-muted text-xs mt-1">
                    Find your Catalog ID in Facebook Commerce Manager → Catalogs
                  </Text>
                </div>

                <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
                  <Text className="text-sm font-medium text-ui-fg-base mb-2">
                    Catalog Sync Status
                  </Text>
                  <div className="flex items-center justify-between">
                    <Text className="text-sm text-ui-fg-subtle">
                      {metadata.instagram_catalog_id
                        ? `Catalog ${metadata.instagram_catalog_id} connected`
                        : "No catalog connected"}
                    </Text>
                    <Badge
                      color={metadata.instagram_catalog_id ? "green" : "grey"}
                      size="2xsmall"
                    >
                      {metadata.instagram_catalog_id ? "Connected" : "Not set"}
                    </Badge>
                  </div>
                  {metadata.meta_updated_at && (
                    <Text className="text-xs text-ui-fg-muted mt-1">
                      Last updated: {new Date(metadata.meta_updated_at).toLocaleDateString()}
                    </Text>
                  )}
                </div>
              </div>
            </Section>
          </div>
        )}

        {activeTab === "cms" && (
          <div className="flex flex-col gap-4">
            <Section
              title="Store Announcement"
              description="Post an announcement banner that appears at the top of your store page for all visitors"
              icon={Tag}
            >
              <div>
                <Label htmlFor="store_announcement" className="mb-1.5 block">
                  Announcement Message
                </Label>
                <Textarea
                  id="store_announcement"
                  placeholder="e.g. 🎉 Summer sale — up to 50% off selected items! Limited time only."
                  rows={3}
                  {...register("store_announcement")}
                />
                <Text className="text-ui-fg-muted text-xs mt-1">
                  Leave empty to hide the announcement banner
                </Text>
              </div>
            </Section>

            <Section
              title="Store Blog Post"
              description="Write a blog post or story that appears on your vendor storefront page"
              icon={Newspaper}
            >
              <div className="flex flex-col gap-4">
                <div>
                  <Label htmlFor="store_blog_title" className="mb-1.5 block">
                    Post Title
                  </Label>
                  <Input
                    id="store_blog_title"
                    placeholder="e.g. Our Sustainable Fashion Journey"
                    {...register("store_blog_title")}
                  />
                </div>
                <div>
                  <Label htmlFor="store_blog_content" className="mb-1.5 block">
                    Post Content
                  </Label>
                  <Textarea
                    id="store_blog_content"
                    placeholder="Write your store story, brand values, or latest news here..."
                    rows={8}
                    {...register("store_blog_content")}
                  />
                  <Text className="text-ui-fg-muted text-xs mt-1">
                    This content is displayed on your public storefront profile
                  </Text>
                </div>
                {metadata.store_blog_title && (
                  <div className="p-4 bg-ui-bg-subtle rounded-lg border border-ui-border-base">
                    <div className="flex items-center gap-2 mb-2">
                      <Text className="text-sm font-medium text-ui-fg-base">Preview</Text>
                      <Badge color="blue" size="2xsmall">Published</Badge>
                    </div>
                    <Text className="font-semibold text-ui-fg-base">{metadata.store_blog_title}</Text>
                    <Text className="text-sm text-ui-fg-subtle mt-1 line-clamp-3">
                      {metadata.store_blog_content}
                    </Text>
                  </div>
                )}
              </div>
            </Section>
          </div>
        )}
      </div>
    </form>
  )
}
