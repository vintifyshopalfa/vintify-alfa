import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { getPaymentProvider } from "../../../modules/payment-abstraction"
import type { CreatePayoutInput } from "../../../modules/payment-abstraction"

type PayoutRequestBody = {
  amount: number
  currency: string
  destination_account_id: string
}

export const POST = async (req: AuthenticatedMedusaRequest<PayoutRequestBody>, res: MedusaResponse) => {
  const { amount, currency, destination_account_id } = req.body ?? {}

  if (typeof amount !== "number" || amount <= 0) {
    return res.status(400).json({ message: "amount must be a positive number" })
  }
  if (typeof currency !== "string" || currency.length !== 3) {
    return res.status(400).json({ message: "currency must be a 3-letter ISO code" })
  }
  if (typeof destination_account_id !== "string" || !destination_account_id) {
    return res.status(400).json({ message: "destination_account_id is required" })
  }

  const authCtx = req.auth_context
  if (!authCtx?.actor_id) {
    return res.status(401).json({ message: "Authentication required" })
  }

  const input: CreatePayoutInput = {
    amount,
    currency,
    destinationAccountId: destination_account_id,
    metadata: { seller_id: authCtx.actor_id },
  }

  try {
    const paymentProvider = getPaymentProvider()
    const result = await paymentProvider.createPayout(input)
    return res.json({ payout: result })
  } catch (error) {
    console.error("[Payout] Failed to create payout:", (error as Error).message)
    return res.status(500).json({ message: "Failed to create payout" })
  }
}
