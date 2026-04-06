import { getSellerPosts, togglePostLike, createComment, getPostComments, getUserLikedIds } from "@/lib/data/social"
import { retrieveCustomer } from "@/lib/data/customer"
import { FeedClientWrapper } from "@/components/social/FeedClientWrapper"
import type { Post, Comment } from "@/lib/data/social"

export const SellerPostsTab = async ({ seller_id }: { seller_id: string }) => {
  const [{ posts, count }, user] = await Promise.all([
    getSellerPosts(seller_id, 0, 10),
    retrieveCustomer().catch(() => null),
  ])

  const likedPostIds = user ? (await getUserLikedIds()).post_ids : []

  async function handleLike(postId: string): Promise<{ liked: boolean; count: number } | null> {
    "use server"
    return togglePostLike(postId)
  }

  async function handleComment(postId: string, body: string): Promise<Comment | null> {
    "use server"
    return createComment(postId, body)
  }

  async function handleLoadComments(postId: string, offset: number): Promise<{ comments: Comment[] }> {
    "use server"
    return getPostComments(postId, offset, 10)
  }

  async function handleLoadMore(offset: number): Promise<{ posts: Post[]; count: number }> {
    "use server"
    return getSellerPosts(seller_id, offset, 10)
  }

  return (
    <div className="py-6">
      {count === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-lg font-semibold mb-2">No posts yet</p>
          <p className="text-sm">This seller hasn&apos;t shared any posts.</p>
        </div>
      ) : (
        <FeedClientWrapper
          initialPosts={posts}
          initialCount={count}
          isAuthenticated={!!user}
          likedPostIds={likedPostIds}
          onLike={handleLike}
          onComment={handleComment}
          onLoadComments={handleLoadComments}
          onLoadMore={handleLoadMore}
        />
      )}
    </div>
  )
}
