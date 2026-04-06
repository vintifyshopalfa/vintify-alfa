import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"

type SellerEventData = { id: string }

export default async function algoliaSellerSyncSubscriber({
  event: { name, data },
  container,
}: SubscriberArgs<SellerEventData>) {
  const appId = process.env.ALGOLIA_APP_ID
  const apiKey = process.env.ALGOLIA_API_KEY
  if (!appId || !apiKey) return

  const sellerId = data.id
  const isDelete = name === "seller.deleted"

  try {
    const { algoliasearch } = await import("algoliasearch")
    const client = algoliasearch(appId, apiKey)
    const indexName = "sellers"

    if (isDelete) {
      await client.deleteObject({ indexName, objectID: sellerId })
      return
    }

    const sellerService = container.resolve(SELLER_MODULE)
    const seller = await sellerService.retrieveSeller(sellerId, {
      relations: ["members", "products"],
    })

    const record = {
      objectID: seller.id,
      name: seller.name,
      description: seller.description,
      email: seller.email,
      photo: seller.photo,
      city: seller.city,
      region: seller.region,
      country_code: seller.country_code,
      store_status: seller.store_status,
      product_count: seller.products?.length ?? 0,
      created_at: seller.created_at,
      updated_at: seller.updated_at,
    }

    await client.saveObject({ indexName, body: record })
    console.log(`[Algolia] Synced seller ${sellerId} (${name})`)
  } catch (error) {
    console.error(
      `[Algolia] Failed to sync seller ${sellerId}: ${(error as Error).message}`
    )
  }
}

export const config: SubscriberConfig = {
  event: ["seller.created", "seller.updated", "seller.deleted"],
}
