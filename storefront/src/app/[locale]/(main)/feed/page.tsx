import { Metadata } from "next"
import { getFeed } from "@/lib/data/social"
import { FeedInfiniteScroll } from "@/components/organisms/FeedInfiniteScroll/FeedInfiniteScroll"
import { getTranslations } from "next-intl/server"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("feed")
  return {
    title: t("title"),
    description: "See the latest posts from sellers on Vintify",
  }
}

export default async function FeedPage() {
  const t = await getTranslations("feed")
  const { posts, count } = await getFeed(1, 20)

  return (
    <main className="container">
      <div className="max-w-2xl mx-auto">
        <h1 className="heading-lg mb-6">{t("title")}</h1>
        <p className="text-secondary mb-6">{t("subtitle")}</p>
        <FeedInfiniteScroll
          initialPosts={posts}
          initialCount={count}
          limit={20}
        />
      </div>
    </main>
  )
}
