export interface CreatePaymentIntentInput {
  amount: number
  currency: string
  customerId?: string
  metadata?: Record<string, string>
}

export interface CapturePaymentInput {
  paymentIntentId: string
  amount?: number
}

export interface RefundPaymentInput {
  paymentIntentId: string
  amount: number
  reason?: string
}

export interface CreatePayoutInput {
  amount: number
  currency: string
  destinationAccountId: string
  metadata?: Record<string, string>
}

export interface PaymentResult {
  id: string
  status: string
  amount?: number
  currency?: string
  metadata?: Record<string, unknown>
}

export interface IPaymentProvider {
  createPaymentIntent(input: CreatePaymentIntentInput): Promise<PaymentResult>
  capturePayment(input: CapturePaymentInput): Promise<PaymentResult>
  refundPayment(input: RefundPaymentInput): Promise<PaymentResult>
  createPayout(input: CreatePayoutInput): Promise<PaymentResult>
}
