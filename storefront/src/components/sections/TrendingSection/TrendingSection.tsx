import { listProducts } from "@/lib/data/products"
import { getTrendingProductIds } from "@/lib/data/social"
import Link from "next/link"
import Image from "next/image"
import { getProductPrice } from "@/lib/helpers/get-product-price"
import type { SellerProps } from "@/types/seller"

type TrendingProduct = {
  id: string
  title?: string | null
  handle?: string | null
  thumbnail?: string | null
  status?: string | null
  images?: Array<{ url: string }> | null
  variants?: Array<Record<string, unknown>> | null
  seller?: SellerProps
  likes_count?: number
  [key: string]: unknown
}

function ProductTile({ product, locale, rank }: { product: TrendingProduct; locale: string; rank: number }) {
  const { cheapestPrice } = getProductPrice({ product })
  const thumb = product.thumbnail || product.images?.[0]?.url

  return (
    <Link
      href={`/${locale}/products/${product.handle}`}
      className="group block rounded-xl overflow-hidden bg-white border border-gray-100 hover:shadow-md transition-all duration-200"
    >
      <div className="relative aspect-square bg-gray-50 overflow-hidden">
        {thumb ? (
          <Image
            src={thumb}
            alt={product.title || "Product"}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(min-width: 1280px) 16vw, (min-width: 768px) 25vw, 50vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {rank <= 3 && (
          <span className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: "#09B1BA" }}>
            #{rank} Trending
          </span>
        )}
        {product.likes_count && product.likes_count > 0 ? (
          <span className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded-full">
            <svg className="w-3 h-3 fill-white" viewBox="0 0 24 24" aria-hidden>
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            {product.likes_count}
          </span>
        ) : null}
      </div>
      <div className="p-3">
        <p className="text-sm font-semibold text-gray-900 truncate">{product.title}</p>
        {cheapestPrice && (
          <p className="text-sm font-bold mt-0.5" style={{ color: "#09B1BA" }}>
            {cheapestPrice.calculated_price}
          </p>
        )}
        {product.seller?.name && (
          <p className="text-xs text-gray-400 mt-0.5 truncate">{product.seller.name}</p>
        )}
      </div>
    </Link>
  )
}

export const TrendingSection = async ({
  locale,
  heading = "Trending Now",
}: {
  locale: string
  heading?: string
}) => {
  let products: TrendingProduct[] = []
  let likesMap: Record<string, number> = {}

  try {
    const trendingData = await getTrendingProductIds(12)
    const trendingIds = trendingData.product_ids
    likesMap = trendingData.counts

    if (trendingIds.length > 0) {
      const result = await listProducts({
        countryCode: locale,
        queryParams: { limit: 12, id: trendingIds } as Record<string, unknown>,
        forceCache: false,
      })
      const trendingProducts = result.response.products as TrendingProduct[]
      products = trendingIds
        .map((id) => trendingProducts.find((p) => p.id === id))
        .filter((p): p is TrendingProduct => !!p)
        .map((p) => ({ ...p, likes_count: likesMap[p.id] }))
    }

    if (products.length < 6) {
      const fallback = await listProducts({
        countryCode: locale,
        queryParams: { limit: 12, order: "-created_at" },
        forceCache: false,
      })
      const seen = new Set(products.map((p) => p.id))
      const extra = (fallback.response.products as TrendingProduct[]).filter((p) => !seen.has(p.id))
      products = [...products, ...extra].slice(0, 12)
    }
  } catch {
    return null
  }

  if (!products.length) return null

  return (
    <section className="py-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900 uppercase tracking-wide">{heading}</h2>
        <Link
          href={`/${locale}/categories`}
          className="text-sm font-medium hover:underline transition-colors"
          style={{ color: "#09B1BA" }}
        >
          See all →
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {products.map((product, i) => (
          <ProductTile key={product.id} product={product} locale={locale} rank={i + 1} />
        ))}
      </div>
    </section>
  )
}
