import { getFeed } from "@/lib/data/social"
import { PostCard } from "@/components/organisms/PostCard/PostCard"

export const SellerPostsTab = async ({ seller_id }: { seller_id: string }) => {
  const { posts: sellerPosts, count } = await getFeed(1, 20, seller_id)

  if (sellerPosts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
        <p className="heading-sm mb-2">No posts yet</p>
        <p className="text-sm">This seller hasn&apos;t shared anything yet.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl space-y-4 mt-6">
      {sellerPosts.map(post => (
        <PostCard key={post.id} post={post} />
      ))}
    </div>
  )
}
