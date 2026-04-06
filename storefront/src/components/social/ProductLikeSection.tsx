import { getProductLikes, toggleProductLike, getUserLikedIds } from "@/lib/data/social"
import { retrieveCustomer } from "@/lib/data/customer"
import { LikeButton } from "./LikeButton"

async function handleToggle(productId: string): Promise<{ liked: boolean; count: number } | null> {
  "use server"
  return toggleProductLike(productId)
}

export const ProductLikeSection = async ({ productId }: { productId: string }) => {
  const [{ liked: serverLiked, count }, user] = await Promise.all([
    getProductLikes(productId),
    retrieveCustomer().catch(() => null),
  ])

  const likedByUser = user
    ? (await getUserLikedIds()).product_ids.includes(productId)
    : false

  return (
    <div className="flex items-center gap-2 mt-3">
      <LikeButton
        initialLiked={likedByUser}
        initialCount={count}
        onToggle={() => handleToggle(productId)}
        isAuthenticated={!!user}
        size="md"
      />
      <span className="text-sm text-gray-500">Save to favorites</span>
    </div>
  )
}
