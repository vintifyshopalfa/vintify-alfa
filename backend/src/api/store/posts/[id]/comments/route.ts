import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { SOCIAL_MODULE } from "../../../../../modules/social"
import SocialService from "../../../../../modules/social/service"
import { ICustomerModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"

const CreateCommentSchema = z.object({
  content: z.string().min(1).max(500),
})

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const { id } = req.params

  try {
    const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)
    const comments = await socialService.listComments(
      { post_id: id },
      { order: { created_at: "ASC" }, take: 100 }
    )

    const commentsWithAuthor = await Promise.all(
      comments.map(async (comment: Record<string, unknown>) => {
        let authorName = "User"
        try {
          const customerService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER)
          const customer = await customerService.retrieveCustomer(comment.customer_id as string)
          authorName = `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() || customer.email || "User"
        } catch {}
        return { ...comment, author_name: authorName }
      })
    )

    return res.json({ comments: commentsWithAuthor })
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch comments" })
  }
}

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const customerId = req.auth_context?.actor_id
  if (!customerId) return res.status(401).json({ message: "Authentication required" })

  const { id: postId } = req.params

  const parsed = CreateCommentSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.errors.map(e => ({ field: e.path.join("."), message: e.message })),
    })
  }

  try {
    const socialService: SocialService = req.scope.resolve(SOCIAL_MODULE)
    const [comment] = await socialService.createComments([
      { post_id: postId, customer_id: customerId, content: parsed.data.content },
    ])

    let authorName = "User"
    try {
      const customerService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER)
      const customer = await customerService.retrieveCustomer(customerId)
      authorName = `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() || customer.email || "User"
    } catch {}

    return res.status(201).json({ comment: { ...comment, author_name: authorName } })
  } catch (error) {
    return res.status(500).json({ message: "Failed to create comment" })
  }
}
