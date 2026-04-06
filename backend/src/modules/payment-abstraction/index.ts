export { IPaymentProvider } from "./types"
export type {
  CreatePaymentIntentInput,
  CapturePaymentInput,
  RefundPaymentInput,
  CreatePayoutInput,
  PaymentResult,
} from "./types"
export { StripePaymentProvider } from "./stripe-provider"

let _provider: import("./types").IPaymentProvider | undefined

export function getPaymentProvider(): import("./types").IPaymentProvider {
  if (!_provider) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { StripePaymentProvider: SP } = require("./stripe-provider")
    _provider = new SP() as import("./types").IPaymentProvider
  }
  return _provider!
}

export function setPaymentProvider(provider: import("./types").IPaymentProvider): void {
  _provider = provider
}
