import { FeedClientWrapper } from "@/components/social/FeedClientWrapper"
import { getFeed, togglePostLike, createComment, getPostComments, getUserLikedIds } from "@/lib/data/social"
import { retrieveCustomer } from "@/lib/data/customer"
import type { Metadata } from "next"
import type { Post, Comment } from "@/lib/data/social"

export const metadata: Metadata = {
  title: "Feed",
  description: "Discover the latest posts from sellers on Vintify",
}

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
  return getFeed(offset, 10)
}

export default async function FeedPage() {
  const [{ posts, count }, user] = await Promise.all([
    getFeed(0, 10),
    retrieveCustomer().catch(() => null),
  ])

  const likedPostIds = user ? (await getUserLikedIds()).post_ids : []

  return (
    <main className="container py-8">
      <div className="max-w-xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Feed</h1>
            <p className="text-sm text-gray-500 mt-1">Latest from sellers you follow</p>
          </div>
          <div
            className="w-2 h-8 rounded-full"
            style={{ backgroundColor: "#09B1BA" }}
            aria-hidden
          />
        </div>

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
      </div>
    </main>
  )
}
