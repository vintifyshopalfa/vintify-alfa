"use client"

import Image from "next/image"
import { HttpTypes } from "@medusajs/types"
import { BaseHit, Hit } from "instantsearch.js"
import clsx from "clsx"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { getProductPrice } from "@/lib/helpers/get-product-price"
import { useTranslations } from "next-intl"

const CONDITION_COLORS: Record<string, string> = {
  new_with_tags: "bg-green-100 text-green-800",
  new_without_tags: "bg-green-50 text-green-700",
  very_good: "bg-blue-50 text-blue-700",
  good: "bg-blue-50 text-blue-600",
  satisfactory: "bg-yellow-50 text-yellow-700",
}

export const ProductCard = ({
  product,
  api_product,
}: {
  product: Hit<HttpTypes.StoreProduct> | Partial<Hit<BaseHit>>
  api_product?: HttpTypes.StoreProduct | null
}) => {
  const t = useTranslations("product.condition")

  if (!api_product) {
    return null
  }

  const { cheapestPrice } = getProductPrice({
    product: api_product! as HttpTypes.StoreProduct,
  })

  const productName = String(product.title || "Product")
  const condition = (product as Record<string, unknown>).condition as string | undefined
  const conditionColor = condition ? CONDITION_COLORS[condition] : null
  const conditionLabel = condition && CONDITION_COLORS[condition]
    ? t(condition as any)
    : null

  return (
    <div
      className={clsx(
        "relative group bg-white border border-neutral-100 rounded-lg overflow-hidden flex flex-col",
        "hover:shadow-md transition-shadow duration-200",
        "w-full lg:w-[calc(25%-1rem)] min-w-[180px]"
      )}
    >
      <LocalizedClientLink
        href={`/products/${product.handle}`}
        aria-label={`View ${productName}`}
      >
        <div className="relative w-full aspect-square bg-neutral-25 overflow-hidden">
          {product.thumbnail ? (
            <Image
              priority
              fetchPriority="high"
              src={decodeURIComponent(product.thumbnail)}
              alt={`${productName} image`}
              fill
              sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
              className="object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <Image
              priority
              fetchPriority="high"
              src="/images/placeholder.svg"
              alt={`${productName} image placeholder`}
              fill
              className="object-contain p-4 opacity-40"
            />
          )}
          {conditionLabel && conditionColor && (
            <span
              className={clsx(
                "absolute top-2 left-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                conditionColor
              )}
            >
              {conditionLabel}
            </span>
          )}
        </div>
      </LocalizedClientLink>

      <LocalizedClientLink
        href={`/products/${product.handle}`}
        aria-label={`Go to ${productName} page`}
        className="flex flex-col flex-1 p-3"
      >
        <p className="text-sm text-neutral-700 truncate leading-tight mb-1.5">{product.title}</p>
        <div className="flex items-baseline gap-2 mt-auto">
          <span className="font-semibold text-sm text-neutral-900">
            {cheapestPrice?.calculated_price}
          </span>
          {cheapestPrice?.calculated_price !== cheapestPrice?.original_price && (
            <span className="text-xs text-neutral-400 line-through">
              {cheapestPrice?.original_price}
            </span>
          )}
        </div>
      </LocalizedClientLink>
    </div>
  )
}
