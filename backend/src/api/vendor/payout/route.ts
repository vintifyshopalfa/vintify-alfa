import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "zod"
import { getPaymentProvider } from "../../../modules/payment-abstraction"
import type { CreatePayoutInput } from "../../../modules/payment-abstraction"

const PayoutSchema = z.object({
  amount: z.number().int().positive("amount must be a positive integer (smallest currency unit)"),
  currency: z.string().length(3, "currency must be a 3-letter ISO 4217 code").toLowerCase(),
  destination_account_id: z.string().min(1, "destination_account_id is required"),
})

type PayoutBody = z.infer<typeof PayoutSchema>

export const POST = async (req: AuthenticatedMedusaRequest<unknown>, res: MedusaResponse) => {
  const authCtx = req.auth_context
  if (!authCtx?.actor_id) {
    return res.status(401).json({ message: "Authentication required" })
  }

  const parsed = PayoutSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
    })
  }

  const { amount, currency, destination_account_id }: PayoutBody = parsed.data

  if (!process.env.STRIPE_SECRET_API_KEY) {
    return res.status(503).json({ message: "Payment processing is not configured" })
  }

  try {
    const input: CreatePayoutInput = {
      amount,
      currency,
      destinationAccountId: destination_account_id,
      metadata: { seller_id: authCtx.actor_id, requested_by: authCtx.actor_id },
    }

    const paymentProvider = getPaymentProvider()
    const result = await paymentProvider.createPayout(input)

    return res.status(201).json({ payout: result })
  } catch (error) {
    console.error("[Payout] Failed to create payout:", (error as Error).message)
    return res.status(500).json({ message: "Failed to create payout" })
  }
}
