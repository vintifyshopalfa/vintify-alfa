import { getProductComments, createProductComment } from "@/lib/data/social"
import { retrieveCustomer } from "@/lib/data/customer"
import { CommentThread } from "./CommentThread"
import type { Comment } from "@/lib/data/social"

async function handleSubmit(productId: string, body: string): Promise<Comment | null> {
  "use server"
  return createProductComment(productId, body)
}

async function handleLoadMore(productId: string, offset: number): Promise<{ comments: Comment[] }> {
  "use server"
  return getProductComments(productId, offset, 10)
}

export const ProductCommentsSection = async ({ productId }: { productId: string }) => {
  const [{ comments }, user] = await Promise.all([
    getProductComments(productId, 0, 10),
    retrieveCustomer().catch(() => null),
  ])

  return (
    <div className="border rounded-sm p-4 mt-3">
      <h3 className="text-sm font-semibold text-gray-700 mb-2">Questions & Comments</h3>
      <CommentThread
        postId={productId}
        initialComments={comments}
        initialTotal={comments.length}
        onSubmit={(_, body) => handleSubmit(productId, body)}
        onLoadMore={(_, offset) => handleLoadMore(productId, offset)}
        isAuthenticated={!!user}
      />
    </div>
  )
}
