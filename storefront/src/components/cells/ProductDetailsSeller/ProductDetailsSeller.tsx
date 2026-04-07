import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { CollapseIcon } from "@/icons"
import { SellerInfo } from "@/components/molecules"
import { SellerProps } from "@/types/seller"
import { HttpTypes } from "@medusajs/types"
import { Chat } from "@/components/organisms/Chat/Chat"

export const ProductDetailsSeller = ({
  seller,
  user,
}: {
  seller?: SellerProps
  user?: HttpTypes.StoreCustomer | null
}) => {
  if (!seller) return null

  return (
    <div className="border rounded-sm mt-4">
      <div className="p-4">
        <LocalizedClientLink href={`/sellers/${seller.handle}`}>
          <div className="flex justify-between items-center">
            <SellerInfo seller={seller} />
            <CollapseIcon className="-rotate-90" />
          </div>
        </LocalizedClientLink>
        <div className="mt-3 pt-3 border-t">
          <Chat
            user={user || null}
            seller={seller}
            buttonClassNames="w-full"
          />
        </div>
      </div>
    </div>
  )
}
