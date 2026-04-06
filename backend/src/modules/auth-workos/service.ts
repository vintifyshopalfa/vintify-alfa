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

type WorkOSProfile = {
  id: string
  email: string
  firstName: string
  lastName: string
}

interface WorkOSSSO {
  getAuthorizationURL(opts: { clientID: string; redirectURI: string; state?: string }): string
  getProfileAndToken(opts: { code: string; clientID: string }): Promise<{ profile: WorkOSProfile }>
}

interface WorkOSClient {
  sso: WorkOSSSO
}

function getSigningKey(): string {
  return process.env.JWT_SECRET || process.env.COOKIE_SECRET || "vintify-workos-state-key"
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

  const sigValid = crypto.timingSafeEqual(
    Buffer.from(signature, "hex"),
    Buffer.from(expectedSig, "hex")
  )
  if (!sigValid) return false

  const expiry = parseInt(expiresAt, 10)
  if (isNaN(expiry) || Date.now() > expiry) return false

  return true
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
      const authUrl = workos.sso.getAuthorizationURL({
        clientID: this.config.clientId,
        redirectURI: this.config.redirectUri,
        state,
      })
      return {
        success: false,
        location: authUrl,
      }
    }

    if (!incomingState || !verifySignedState(incomingState)) {
      return {
        success: false,
        error: "Invalid or expired OAuth state — possible CSRF attack or session expired",
      }
    }

    try {
      const workos = await this.getWorkOS()
      const { profile } = await workos.sso.getProfileAndToken({
        code,
        clientID: this.config.clientId,
      })

      const entityId = profile.id
      let authIdentity = await authIdentityProviderService
        .retrieve({ entity_id: entityId })
        .catch(() => null)

      if (!authIdentity) {
        authIdentity = await authIdentityProviderService.create({
          entity_id: entityId,
          provider_metadata: {
            email: profile.email,
            first_name: profile.firstName,
            last_name: profile.lastName,
          },
        })
      }

      return {
        success: true,
        authIdentity,
      }
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
