import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { CollapseIcon } from "@/icons"
import { SellerInfo } from "@/components/molecules"
import { SellerProps } from "@/types/seller"
import { ContactSellerButton } from "@/components/social/ContactSellerButton"

type ProductDetailsSellerProps = {
  seller?: SellerProps
  productTitle?: string
  hasTalkJS?: boolean
}

export const ProductDetailsSeller = ({
  seller,
  productTitle,
  hasTalkJS = false,
}: ProductDetailsSellerProps) => {
  if (!seller) return null

  return (
    <div className="border rounded-sm overflow-hidden">
      <div className="p-4">
        <LocalizedClientLink href={`/sellers/${seller.handle}`}>
          <div className="flex justify-between items-center">
            <SellerInfo seller={seller} />
            <CollapseIcon className="-rotate-90" />
          </div>
        </LocalizedClientLink>
      </div>
      {hasTalkJS && (
        <div className="px-4 pb-4">
          <ContactSellerButton
            sellerId={seller.id}
            sellerName={seller.name || "Seller"}
            productTitle={productTitle}
          />
        </div>
      )}
    </div>
  )
}
