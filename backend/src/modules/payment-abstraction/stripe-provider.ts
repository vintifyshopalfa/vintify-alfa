import type Stripe from "stripe"
import type {
  IPaymentProvider,
  CreatePaymentIntentInput,
  CapturePaymentInput,
  RefundPaymentInput,
  CreatePayoutInput,
  PaymentResult,
} from "./types"

const STRIPE_API_VERSION = "2023-10-16" as Stripe.LatestApiVersion

export class StripePaymentProvider implements IPaymentProvider {
  private stripeClient: Stripe | null = null
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.STRIPE_SECRET_API_KEY || ""
    if (!this.apiKey) {
      console.warn("[StripePaymentProvider] STRIPE_SECRET_API_KEY not set — payment operations will fail")
    }
  }

  private async getStripe(): Promise<Stripe> {
    if (!this.stripeClient) {
      const StripeClass = (await import("stripe")).default
      this.stripeClient = new StripeClass(this.apiKey, { apiVersion: STRIPE_API_VERSION })
    }
    return this.stripeClient
  }

  async createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentResult> {
    const stripe = await this.getStripe()
    const intent = await stripe.paymentIntents.create({
      amount: input.amount,
      currency: input.currency,
      customer: input.customerId,
      metadata: input.metadata,
    })
    return { id: intent.id, status: intent.status, amount: intent.amount, currency: intent.currency }
  }

  async capturePayment(input: CapturePaymentInput): Promise<PaymentResult> {
    const stripe = await this.getStripe()
    const intent = await stripe.paymentIntents.capture(input.paymentIntentId, {
      ...(input.amount ? { amount_to_capture: input.amount } : {}),
    })
    return { id: intent.id, status: intent.status }
  }

  async refundPayment(input: RefundPaymentInput): Promise<PaymentResult> {
    const stripe = await this.getStripe()
    const validReasons: Stripe.RefundCreateParams.Reason[] = ["duplicate", "fraudulent", "requested_by_customer"]
    const reason = validReasons.includes(input.reason as Stripe.RefundCreateParams.Reason)
      ? (input.reason as Stripe.RefundCreateParams.Reason)
      : undefined
    const refund = await stripe.refunds.create({
      payment_intent: input.paymentIntentId,
      amount: input.amount,
      reason,
    })
    return { id: refund.id, status: refund.status ?? "pending", amount: refund.amount ?? input.amount }
  }

  async createPayout(input: CreatePayoutInput): Promise<PaymentResult> {
    const stripe = await this.getStripe()
    const transfer = await stripe.transfers.create({
      amount: input.amount,
      currency: input.currency,
      destination: input.destinationAccountId,
      metadata: input.metadata,
    })
    return { id: transfer.id, status: "succeeded", amount: transfer.amount }
  }
}
