import type {
  IPaymentProvider,
  CreatePaymentIntentInput,
  CapturePaymentInput,
  RefundPaymentInput,
  CreatePayoutInput,
  PaymentResult,
} from "./types"

export class NoopPaymentProvider implements IPaymentProvider {
  private disabledResult(operation: string): never {
    throw new Error(`[PaymentProvider:NOOP] ${operation} is disabled. Configure PAYMENT_PROVIDER and provider credentials.`)
  }

  async createPaymentIntent(_input: CreatePaymentIntentInput): Promise<PaymentResult> {
    return this.disabledResult("createPaymentIntent")
  }

  async capturePayment(_input: CapturePaymentInput): Promise<PaymentResult> {
    return this.disabledResult("capturePayment")
  }

  async refundPayment(_input: RefundPaymentInput): Promise<PaymentResult> {
    return this.disabledResult("refundPayment")
  }

  async createPayout(_input: CreatePayoutInput): Promise<PaymentResult> {
    return this.disabledResult("createPayout")
  }
}
