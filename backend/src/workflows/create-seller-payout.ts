import { createStep, createWorkflow, StepResponse, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { getPaymentProvider } from "../modules/payment-abstraction"
import type { PaymentResult, CreatePayoutInput } from "../modules/payment-abstraction"

const MAX_PAYOUT_AMOUNT = 1_000_000_00

export type SellerPayoutInput = {
  seller_id: string
  actor_id: string
  amount: number
  currency: string
  destination_account_id: string
}

export type SellerPayoutOutput = {
  payout: PaymentResult
  seller_id: string
  actor_id: string
}

const validatePayoutStep = createStep(
  "validate-payout-step",
  async (input: SellerPayoutInput): Promise<StepResponse<SellerPayoutInput>> => {
    const { amount, currency, destination_account_id, seller_id, actor_id } = input

    if (!seller_id) throw new Error("seller_id is required to create a payout")
    if (!actor_id) throw new Error("actor_id is required to create a payout")
    if (!destination_account_id) throw new Error("destination_account_id is required")
    if (amount > MAX_PAYOUT_AMOUNT) {
      throw new Error(`Payout amount exceeds maximum allowed (${MAX_PAYOUT_AMOUNT} smallest currency units)`)
    }
    if (currency.length !== 3) throw new Error("currency must be a valid ISO 4217 code")

    return new StepResponse(input)
  }
)

const executePayoutStep = createStep(
  "execute-payout-step",
  async (input: SellerPayoutInput): Promise<StepResponse<SellerPayoutOutput>> => {
    const { amount, currency, destination_account_id, seller_id, actor_id } = input

    const payoutInput: CreatePayoutInput = {
      amount,
      currency,
      destinationAccountId: destination_account_id,
      metadata: { seller_id, requested_by: actor_id },
    }

    const paymentProvider = getPaymentProvider()
    const payout = await paymentProvider.createPayout(payoutInput)

    return new StepResponse<SellerPayoutOutput>({ payout, seller_id, actor_id })
  }
)

export const createSellerPayoutWorkflow = createWorkflow(
  "create-seller-payout",
  (input: SellerPayoutInput) => {
    validatePayoutStep(input)
    const result = executePayoutStep(input)
    return new WorkflowResponse(result)
  }
)
