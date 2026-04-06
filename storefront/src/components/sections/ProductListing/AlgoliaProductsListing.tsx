"use client"

import { HttpTypes } from "@medusajs/types"
import {
  AlgoliaProductSidebar,
  ProductCard,
  ProductListingActiveFilters,
  ProductsPagination,
  ProductListingHeader,
} from "@/components/organisms"
import { client } from "@/lib/client"
import { Configure, useHits } from "react-instantsearch"
import { InstantSearchNext } from "react-instantsearch-nextjs"
import { useSearchParams } from "next/navigation"
import { getFacedFilters } from "@/lib/helpers/get-faced-filters"
import { PRODUCT_LIMIT } from "@/const"
import { ProductListingSkeleton } from "@/components/organisms/ProductListingSkeleton/ProductListingSkeleton"
import { useEffect, useState } from "react"
import { listProducts } from "@/lib/data/products"
import { getProductPrice } from "@/lib/helpers/get-product-price"

export const AlgoliaProductsListing = ({
  category_id,
  collection_id,
  seller_handle,
  locale = process.env.NEXT_PUBLIC_DEFAULT_REGION,
  currency_code,
}: {
  category_id?: string
  collection_id?: string
  locale?: string
  seller_handle?: string
  currency_code: string
}) => {
  const searchParamas = useSearchParams()

  const facetFilters: string = getFacedFilters(searchParamas)
  const query: string = searchParamas.get("query") || ""

  const filters = `${
    seller_handle
      ? `NOT seller:null AND seller.handle:${seller_handle} AND `
      : "NOT seller:null AND "
  }NOT seller.store_status:SUSPENDED AND supported_countries:${locale}${
    category_id
      ? ` AND categories.id:${category_id}${
          collection_id !== undefined
            ? ` AND collections.id:${collection_id}`
            : ""
        } ${facetFilters}`
      : ` ${facetFilters}`
  }`

  return (
    <InstantSearchNext searchClient={client} indexName="products">
      <Configure query={query} filters={filters} />
      <ProductsListing
        locale={locale}
        currency_code={currency_code}
        filters={filters}
      />
    </InstantSearchNext>
  )
}

const ProductsListing = ({
  locale,
  currency_code,
  filters,
}: {
  locale?: string
  currency_code: string
  filters: string
}) => {
  const [apiProducts, setApiProducts] = useState<
    HttpTypes.StoreProduct[] | null
  >(null)
  const { items, results } = useHits()

  const searchParamas = useSearchParams()

  async function handleSetProducts() {
    try {
      setApiProducts(null)
      const { response } = await listProducts({
        countryCode: locale,
        queryParams: {
          fields:
            "*variants.calculated_price,*seller.reviews,-thumbnail,-images,-type,-tags,-variants.options,-options,-collection,-collection_id",
          handle: items.map((item) => item.handle),
          limit: items.length,
        },
      })

      setApiProducts(
        response.products.filter((prod) => {
          const { cheapestPrice } = getProductPrice({ product: prod })
          return Boolean(cheapestPrice) && prod
        })
      )
    } catch (error) {
      setApiProducts(null)
    }
  }

  useEffect(() => {
    handleSetProducts()
  }, [items.length])

  if (!results?.processingTimeMS) return <ProductListingSkeleton />

  const page: number = +(searchParamas.get("page") || 1)
  const sortBy = searchParamas.get("sortBy") || ""

  const filteredProducts = items.filter((pr) =>
    apiProducts?.some((p: any) => p.id === pr.objectID)
  )

  let sortedProducts = filteredProducts.filter((pr) =>
    apiProducts?.some(
      (p: any) => p.id === pr.objectID && filterProductsByCurrencyCode(p)
    )
  )

  if (sortBy === "created_at") {
    sortedProducts = [...sortedProducts].sort((a, b) => {
      const aDate = typeof a.created_at === "string" ? new Date(a.created_at).getTime() : 0
      const bDate = typeof b.created_at === "string" ? new Date(b.created_at).getTime() : 0
      return bDate - aDate
    })
  } else if (sortBy === "price_asc" || sortBy === "price_desc") {
    sortedProducts = [...sortedProducts].sort((a, b) => {
      const aProduct = apiProducts?.find((p: any) => p.id === a.objectID)
      const bProduct = apiProducts?.find((p: any) => p.id === b.objectID)
      const aPrice = aProduct?.variants?.[0]?.calculated_price?.calculated_amount ?? 0
      const bPrice = bProduct?.variants?.[0]?.calculated_price?.calculated_amount ?? 0
      return sortBy === "price_asc" ? aPrice - bPrice : bPrice - aPrice
    })
  }

  const products = sortedProducts.slice((page - 1) * PRODUCT_LIMIT, page * PRODUCT_LIMIT)

  const count = filteredProducts?.length || 0
  const pages = Math.ceil(count / PRODUCT_LIMIT) || 1

  function filterProductsByCurrencyCode(product: HttpTypes.StoreProduct) {
    const minPrice = searchParamas.get("min_price")
    const maxPrice = searchParamas.get("max_price")

    if ([minPrice, maxPrice].some((price) => typeof price === "string")) {
      const variantsWithCurrencyCode = product?.variants?.filter(
        (variant) => variant.calculated_price?.currency_code === currency_code
      )

      if (!variantsWithCurrencyCode?.length) {
        return false
      }

      if (minPrice && maxPrice) {
        return variantsWithCurrencyCode.some(
          (variant) =>
            (variant.calculated_price?.calculated_amount ?? 0) >= +minPrice &&
            (variant.calculated_price?.calculated_amount ?? 0) <= +maxPrice
        )
      }
      if (minPrice) {
        return variantsWithCurrencyCode.some(
          (variant) =>
            (variant.calculated_price?.calculated_amount ?? 0) >= +minPrice
        )
      }
      if (maxPrice) {
        return variantsWithCurrencyCode.some(
          (variant) =>
            (variant.calculated_price?.calculated_amount ?? 0) <= +maxPrice
        )
      }
    }

    return true
  }

  return (
    <div className="min-h-[70vh]">
      <ProductListingHeader total={count} />
      <div className="hidden md:block">
        <ProductListingActiveFilters />
      </div>
      <div className="md:flex gap-4">
        <div className="w-[280px] flex-shrink-0 hidden md:block">
          <AlgoliaProductSidebar />
        </div>
        <div className="w-full">
          {!items.length ? (
            <div className="text-center w-full my-10">
              <h2 className="uppercase text-primary heading-lg">no results</h2>
              <p className="mt-4 text-lg">
                Sorry, we can&apos;t find any results for your criteria
              </p>
            </div>
          ) : (
            <div className="w-full">
              <ul className="flex flex-wrap gap-4">
                {products.map(
                  (hit) =>
                    apiProducts?.find((p: any) => p.id === hit.objectID) && (
                      <ProductCard
                        api_product={apiProducts?.find(
                          (p: any) => p.id === hit.objectID
                        )}
                        key={hit.objectID}
                        product={hit}
                      />
                    )
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
      <ProductsPagination pages={pages} />
    </div>
  )
}
