import { getFeed } from "@/lib/data/social"
import { retrieveCustomer } from "@/lib/data/customer"
import { FeedClientWrapper } from "@/components/social/FeedClientWrapper"
import { togglePostLike, createComment } from "@/lib/data/social"
import type { Post, Comment } from "@/lib/data/social"

async function handleLike(postId: string): Promise<{ liked: boolean; count: number } | null> {
  "use server"
  return togglePostLike(postId)
}

async function handleComment(postId: string, body: string): Promise<Comment | null> {
  "use server"
  return createComment(postId, body)
}

async function handleLoadMore(offset: number): Promise<{ posts: Post[]; count: number }> {
  "use server"
  return getFeed(offset, 10)
}

export const SellerPostsTab = async ({ seller_id }: { seller_id: string }) => {
  const [{ posts, count }, user] = await Promise.all([
    getFeed(0, 10),
    retrieveCustomer().catch(() => null),
  ])

  const sellerPosts = posts.filter((p: Post) => p.seller_id === seller_id)

  return (
    <div className="py-6">
      <FeedClientWrapper
        initialPosts={sellerPosts}
        initialCount={sellerPosts.length}
        isAuthenticated={!!user}
        onLike={handleLike}
        onComment={handleComment}
        onLoadMore={handleLoadMore}
      />
    </div>
  )
}
