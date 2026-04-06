import { AbstractAuthModuleProvider } from "@medusajs/framework/utils"
import type {
  AuthenticationInput,
  AuthenticationResponse,
  AuthIdentityProviderService,
} from "@medusajs/types"
import type { WorkOS } from "@workos-inc/node"

type WorkOSProviderConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

class WorkOSAuthProvider extends AbstractAuthModuleProvider {
  static identifier = "workos"
  static DISPLAY_NAME = "WorkOS SSO"

  private config: WorkOSProviderConfig
  private workosClient: WorkOS | null = null

  constructor(deps: Record<string, unknown>, options: WorkOSProviderConfig) {
    super()
    this.config = options || ({} as WorkOSProviderConfig)
  }

  private async getWorkOS(): Promise<WorkOS> {
    if (!this.workosClient) {
      if (!this.config?.clientId || !this.config?.clientSecret) {
        throw new Error("[WorkOS] WORKOS_CLIENT_ID and WORKOS_CLIENT_SECRET are required")
      }
      const { WorkOS: WorkOSClass } = await import("@workos-inc/node")
      this.workosClient = new WorkOSClass(this.config.clientSecret)
    }
    return this.workosClient
  }

  async authenticate(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService
  ): Promise<AuthenticationResponse> {
    const body = data.body as Record<string, string> | undefined
    const code = body?.code

    if (!code) {
      const workos = await this.getWorkOS()
      const authUrl = (workos as unknown as { sso: { getAuthorizationURL: (opts: Record<string, string>) => string } }).sso.getAuthorizationURL({
        clientID: this.config.clientId,
        redirectURI: this.config.redirectUri,
      })
      return {
        success: false,
        location: authUrl,
      }
    }

    try {
      const workos = await this.getWorkOS()
      const sso = (workos as unknown as {
        sso: {
          getProfileAndToken: (opts: Record<string, string>) => Promise<{
            profile: { id: string; email: string; firstName: string; lastName: string }
          }>
        }
      }).sso

      const { profile } = await sso.getProfileAndToken({
        code,
        clientID: this.config.clientId,
      })

      const entityId = profile.id
      let authIdentity = await authIdentityProviderService
        .retrieve({ entity_id: entityId, provider: WorkOSAuthProvider.identifier })
        .catch(() => null)

      if (!authIdentity) {
        authIdentity = await authIdentityProviderService.create({
          entity_id: entityId,
          provider: WorkOSAuthProvider.identifier,
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
