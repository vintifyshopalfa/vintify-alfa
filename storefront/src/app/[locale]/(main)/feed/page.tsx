import { Metadata } from "next"
import { getFeed } from "@/lib/data/social"
import { FeedInfiniteScroll } from "@/components/organisms/FeedInfiniteScroll/FeedInfiniteScroll"

export const metadata: Metadata = {
  title: "Social Feed",
  description: "See the latest posts from sellers on Vintify",
}

export default async function FeedPage() {
  const { posts, count } = await getFeed(1, 20)

  return (
    <main className="container">
      <div className="max-w-2xl mx-auto">
        <h1 className="heading-lg mb-6">Feed</h1>
        <FeedInfiniteScroll
          initialPosts={posts}
          initialCount={count}
          limit={20}
        />
      </div>
    </main>
  )
}
