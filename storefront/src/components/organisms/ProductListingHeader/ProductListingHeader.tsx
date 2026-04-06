"use client"
import { useSearchParams } from "next/navigation"
import useUpdateSearchParams from "@/hooks/useUpdateSearchParams"

const SORT_OPTIONS = [
  { label: "Relevance", value: "" },
  { label: "Newest", value: "created_at" },
  { label: "Price: Low to High", value: "price_asc" },
  { label: "Price: High to Low", value: "price_desc" },
]

export const ProductListingHeader = ({ total }: { total: number }) => {
  const searchParams = useSearchParams()
  const updateSearchParams = useUpdateSearchParams()
  const current = searchParams.get("sortBy") || ""

  return (
    <div className="flex justify-between w-full items-center mb-2">
      <div className="label-md">{total} listings</div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500 hidden md:inline">Sort by:</span>
        <select
          value={current}
          onChange={(e) => updateSearchParams("sortBy", e.target.value)}
          className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500 bg-white"
          aria-label="Sort listings"
        >
          {SORT_OPTIONS.map(({ label, value }) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
