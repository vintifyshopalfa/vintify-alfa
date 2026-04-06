import { AbstractAuthModuleProvider } from "@medusajs/framework/utils"
import type {
  AuthenticationInput,
  AuthenticationResponse,
  AuthIdentityProviderService,
} from "@medusajs/framework/types"
import crypto from "crypto"

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
    const storedState = (data as Record<string, unknown>).session_state as string | undefined

    if (!code) {
      const state = crypto.randomBytes(16).toString("hex")
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

    if (storedState && incomingState !== storedState) {
      return { success: false, error: "OAuth state mismatch — possible CSRF attack" }
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
