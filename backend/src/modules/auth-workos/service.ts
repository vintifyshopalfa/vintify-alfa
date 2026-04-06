import { AbstractAuthModuleProvider } from "@medusajs/framework/utils"
import type {
  AuthenticationInput,
  AuthenticationResponse,
  AuthIdentityProviderService,
} from "@medusajs/framework/types"
import crypto from "crypto"

const STATE_TTL_MS = 10 * 60 * 1000

type WorkOSProviderConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

type WorkOSUser = {
  id: string
  email: string
  firstName?: string | null
  lastName?: string | null
}

type AuthenticateResult = {
  user: WorkOSUser
  authenticationMethod?: string
}

interface WorkOSUserManagement {
  getAuthorizationUrl(opts: {
    clientId: string
    redirectUri: string
    state?: string
    organizationId?: string
  }): string
  authenticateWithCode(opts: {
    code: string
    clientId: string
  }): Promise<AuthenticateResult>
}

interface WorkOSClient {
  userManagement: WorkOSUserManagement
}

function getSigningKey(): string {
  const key =
    process.env.WORKOS_STATE_SECRET ??
    process.env.JWT_SECRET ??
    process.env.COOKIE_SECRET
  if (!key) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "[WorkOS] WORKOS_STATE_SECRET (or JWT_SECRET) is required in production. " +
          "Set a random 32+ character secret to sign OAuth CSRF state tokens."
      )
    }
    console.warn(
      "[WorkOS] WARNING: WORKOS_STATE_SECRET is not set. Using insecure default — " +
        "set this env var before deploying to production."
    )
    return "dev-workos-state-key-change-before-production"
  }
  return key
}

function createSignedState(): string {
  const nonce = crypto.randomBytes(16).toString("hex")
  const expiresAt = (Date.now() + STATE_TTL_MS).toString()
  const payload = `${nonce}.${expiresAt}`
  const signature = crypto
    .createHmac("sha256", getSigningKey())
    .update(payload)
    .digest("hex")
  return `${payload}.${signature}`
}

function verifySignedState(state: string): boolean {
  const parts = state.split(".")
  if (parts.length !== 3) return false
  const [nonce, expiresAt, signature] = parts
  const payload = `${nonce}.${expiresAt}`

  const expectedSig = crypto
    .createHmac("sha256", getSigningKey())
    .update(payload)
    .digest("hex")

  const sigBuffer = Buffer.from(signature, "hex")
  const expectedSigBuffer = Buffer.from(expectedSig, "hex")
  if (sigBuffer.length !== expectedSigBuffer.length) return false
  if (!crypto.timingSafeEqual(sigBuffer, expectedSigBuffer)) return false

  const expiry = parseInt(expiresAt, 10)
  return !isNaN(expiry) && Date.now() <= expiry
}

class WorkOSAuthProvider extends AbstractAuthModuleProvider {
  static identifier = "workos"
  static DISPLAY_NAME = "WorkOS SSO"

  private config: WorkOSProviderConfig
  private workosClient: WorkOSClient | null = null

  constructor(deps: Record<string, unknown>, options: WorkOSProviderConfig) {
    super()
    this.config = options || ({} as WorkOSProviderConfig)
  }

  private async getWorkOS(): Promise<WorkOSClient> {
    if (!this.workosClient) {
      if (!this.config?.clientId || !this.config?.clientSecret) {
        throw new Error("[WorkOS] WORKOS_CLIENT_ID and WORKOS_CLIENT_SECRET are required")
      }
      const { WorkOS: WorkOSClass } = await import("@workos-inc/node")
      this.workosClient = new WorkOSClass(this.config.clientSecret) as unknown as WorkOSClient
    }
    return this.workosClient
  }

  async authenticate(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const body = data.body as Record<string, string> | undefined
    const code = body?.code
    const incomingState = body?.state

    if (!code) {
      const state = createSignedState()
      const workos = await this.getWorkOS()
      const authUrlOptions: Parameters<WorkOSUserManagement["getAuthorizationUrl"]>[0] = {
        clientId: this.config.clientId,
        redirectUri: this.config.redirectUri,
        state,
      }
      if (process.env.WORKOS_ORGANIZATION_ID) {
        authUrlOptions.organizationId = process.env.WORKOS_ORGANIZATION_ID
      }
      const authUrl = workos.userManagement.getAuthorizationUrl(authUrlOptions)
      return { success: false, location: authUrl }
    }

    if (!incomingState || !verifySignedState(incomingState)) {
      return {
        success: false,
        error: "Invalid or expired OAuth state — possible CSRF attack or session expired",
      }
    }

    try {
      const workos = await this.getWorkOS()
      const { user, authenticationMethod } = await workos.userManagement.authenticateWithCode({
        code,
        clientId: this.config.clientId,
      })

      if (process.env.WORKOS_REQUIRE_MFA === "true") {
        const mfaMethods = ["MagicAuth", "GoogleOauth", "MicrosoftOauth", "Sso"]
        const isMfaVerified =
          typeof authenticationMethod === "string" && !mfaMethods.includes(authenticationMethod)
        if (!isMfaVerified) {
          const mfaFallbackMethods = ["ToTP", "SMS"]
          const methodStr = authenticationMethod ?? ""
          const passesMfa = mfaFallbackMethods.some((m) => methodStr.toLowerCase().includes(m.toLowerCase()))
          if (!passesMfa) {
            return {
              success: false,
              error:
                "MFA is required for this organization. Please enroll in multi-factor authentication via your WorkOS organization settings.",
            }
          }
        }
      }

      let authIdentity = await authIdentityProviderService
        .retrieve({ entity_id: user.id })
        .catch(() => null)

      if (!authIdentity) {
        authIdentity = await authIdentityProviderService.create({
          entity_id: user.id,
          provider_metadata: {
            email: user.email,
            first_name: user.firstName ?? "",
            last_name: user.lastName ?? "",
          },
        })
      }

      return { success: true, authIdentity }
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
      }
    }
  }

  async validateCallback(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    return this.authenticate(data, authIdentityProviderService)
  }
}

export default WorkOSAuthProvider
