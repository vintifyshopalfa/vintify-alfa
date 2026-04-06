import {
  IPaymentProvider,
  CreatePaymentIntentInput,
  CapturePaymentInput,
  RefundPaymentInput,
  CreatePayoutInput,
  PaymentResult,
} from "./types"

export class StripePaymentProvider implements IPaymentProvider {
  private stripe: any
  private apiKey: string

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.STRIPE_SECRET_API_KEY || ""
    if (!this.apiKey) {
      console.warn("[StripePaymentProvider] STRIPE_SECRET_API_KEY not set — payment operations will fail")
    }
  }

  private async getStripe() {
    if (!this.stripe) {
      const Stripe = (await import("stripe")).default
      this.stripe = new Stripe(this.apiKey, { apiVersion: "2023-10-16" as any })
    }
    return this.stripe
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
    const refund = await stripe.refunds.create({
      payment_intent: input.paymentIntentId,
      amount: input.amount,
      reason: input.reason as any,
    })
    return { id: refund.id, status: refund.status, amount: refund.amount }
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
