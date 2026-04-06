import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SELLER_MODULE } from "@mercurjs/b2c-core/modules/seller"
import { z } from "zod"
import { createSellerPayoutWorkflow, type SellerPayoutOutput } from "../../../workflows/create-seller-payout"

const PAYOUT_MAX_AMOUNT = 1_000_000_00

const PayoutSchema = z.object({
  amount: z
    .number()
    .int("amount must be an integer (smallest currency unit, e.g. cents)")
    .positive("amount must be positive")
    .max(PAYOUT_MAX_AMOUNT, `amount must not exceed ${PAYOUT_MAX_AMOUNT}`),
  currency: z.string().length(3, "currency must be a 3-letter ISO 4217 code").toLowerCase(),
  destination_account_id: z.string().min(1, "destination_account_id is required"),
})

type PayoutBody = z.infer<typeof PayoutSchema>

type SellerMember = { customer_id?: string; user_id?: string }
type SellerRecord = {
  id: string
  store_status?: string
  metadata?: Record<string, unknown>
  members?: SellerMember[]
}

interface ISellerModuleService {
  listSellers(filters?: Record<string, unknown>, options?: Record<string, unknown>): Promise<SellerRecord[]>
}

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
    const sellerService = req.scope.resolve<ISellerModuleService>(SELLER_MODULE)

    const sellers = await sellerService.listSellers(
      {},
      { relations: ["members"] }
    )

    const actorSeller = sellers.find((s) =>
      s.members?.some(
        (m) => m.customer_id === authCtx.actor_id || m.user_id === authCtx.actor_id
      )
    )

    if (!actorSeller) {
      return res.status(403).json({ message: "Access denied: you are not a registered seller" })
    }

    if (actorSeller.store_status !== "approved" && actorSeller.store_status !== "active") {
      return res.status(403).json({ message: "Your seller account is not approved for payouts" })
    }

    const registeredAccount = actorSeller.metadata?.stripe_account_id as string | undefined
    if (!registeredAccount) {
      return res.status(403).json({ message: "No payout account registered. Please connect your Stripe account." })
    }

    if (registeredAccount !== destination_account_id) {
      return res.status(403).json({ message: "destination_account_id does not match your registered payout account" })
    }

    const { result } = await createSellerPayoutWorkflow(req.scope).run({
      input: {
        seller_id: actorSeller.id,
        actor_id: authCtx.actor_id,
        amount,
        currency,
        destination_account_id,
      },
    })

    const typedResult = result as unknown as SellerPayoutOutput
    return res.status(201).json({ payout: typedResult.payout, seller_id: typedResult.seller_id })
  } catch (error) {
    console.error("[Payout] Failed to create payout:", (error as Error).message)
    return res.status(500).json({ message: "Failed to create payout" })
  }
}
