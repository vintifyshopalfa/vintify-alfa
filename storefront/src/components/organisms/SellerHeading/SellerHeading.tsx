import { SellerInfo } from "@/components/molecules"
import { SellerProps } from "@/types/seller"
import { Chat } from "../Chat/Chat"
import { FollowButton } from "@/components/social/FollowButton"

type CustomerLike = { id: string; email: string; [key: string]: unknown }

export const SellerHeading = ({
  seller,
  user,
  header,
}: {
  header: boolean
  seller: SellerProps
  user: CustomerLike | null
}) => {
  return (
    <div className="flex justify-between flex-col lg:flex-row">
      <SellerInfo header seller={seller} />
      <div className="flex items-center gap-3 mt-4 lg:mt-0">
        <FollowButton sellerId={seller.id} sellerName={seller.name || undefined} />
        {user && (
          <Chat
            user={user}
            seller={seller}
            icon
            buttonClassNames="w-10 h-10 flex justify-center items-center p-0"
          />
        )}
      </div>
    </div>
  )
}
