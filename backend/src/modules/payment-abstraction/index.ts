export type { IPaymentProvider } from "./types"
export type {
  CreatePaymentIntentInput,
  CapturePaymentInput,
  RefundPaymentInput,
  CreatePayoutInput,
  PaymentResult,
} from "./types"
export { StripePaymentProvider } from "./stripe-provider"
export { NoopPaymentProvider } from "./noop-provider"

let _provider: import("./types").IPaymentProvider | undefined

function resolveProvider(): import("./types").IPaymentProvider {
  const configured = (process.env.PAYMENT_PROVIDER || "stripe").toLowerCase()

  if (configured === "stripe") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { StripePaymentProvider: SP } = require("./stripe-provider")
    return new SP() as import("./types").IPaymentProvider
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { NoopPaymentProvider: NP } = require("./noop-provider")
  return new NP() as import("./types").IPaymentProvider
}

export function getPaymentProvider(): import("./types").IPaymentProvider {
  if (!_provider) {
    _provider = resolveProvider()
  }
  return _provider!
}

export function setPaymentProvider(provider: import("./types").IPaymentProvider): void {
  _provider = provider
}
