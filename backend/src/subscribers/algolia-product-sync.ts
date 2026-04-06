import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { IProductModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

type ProductEventData = { id: string }

export default async function algoliaProductSyncSubscriber({
  event: { name, data },
  container,
}: SubscriberArgs<ProductEventData>) {
  const appId = process.env.ALGOLIA_APP_ID
  const apiKey = process.env.ALGOLIA_API_KEY
  if (!appId || !apiKey) return

  const productId = data.id
  const isDelete = name === "product.deleted"

  try {
    const { algoliasearch } = await import("algoliasearch")
    const client = algoliasearch(appId, apiKey)
    const indexName = "products"

    if (isDelete) {
      await client.deleteObject({ indexName, objectID: productId })
      return
    }

    const productService: IProductModuleService = container.resolve(Modules.PRODUCT)
    const product = await productService.retrieveProduct(productId, {
      relations: ["variants", "images", "categories", "tags"],
    })

    const record = {
      objectID: product.id,
      title: product.title,
      description: product.description,
      handle: product.handle,
      status: product.status,
      thumbnail: product.thumbnail,
      images: product.images?.map((i: any) => i.url) || [],
      categories: product.categories?.map((c: any) => c.name) || [],
      tags: product.tags?.map((t: any) => t.value) || [],
      created_at: product.created_at,
      updated_at: product.updated_at,
    }

    await client.saveObject({ indexName, body: record })
    console.log(`[Algolia] Synced product ${productId} (${name})`)
  } catch (error) {
    console.error(`[Algolia] Failed to sync product ${productId}:`, error?.message)
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated", "product.deleted"],
}
