import { AbstractAuthModuleProvider } from "@medusajs/framework/utils"

type WorkOSProviderConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

class WorkOSAuthProvider extends AbstractAuthModuleProvider {
  static identifier = "workos"
  static DISPLAY_NAME = "WorkOS SSO"

  private config: WorkOSProviderConfig
  private workos: any

  constructor(deps: Record<string, unknown>, options: WorkOSProviderConfig) {
    super()
    this.config = options || ({} as WorkOSProviderConfig)
  }

  private async getWorkOS() {
    if (!this.workos) {
      if (!this.config?.clientId || !this.config?.clientSecret) {
        throw new Error("[WorkOS] WORKOS_CLIENT_ID and WORKOS_CLIENT_SECRET are required")
      }
      const { WorkOS } = await import("@workos-inc/node")
      this.workos = new WorkOS(this.config.clientSecret)
    }
    return this.workos
  }

  async authenticate(data: any, authIdentityProviderService: any): Promise<any> {
    const { code } = data.body || {}

    if (!code) {
      const workos = await this.getWorkOS()
      const authUrl = workos.sso.getAuthorizationURL({
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
      const { profile } = await workos.sso.getProfileAndToken({
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
        error: error.message,
      }
    }
  }

  async validateCallback(data: any, authIdentityProviderService: any): Promise<any> {
    return this.authenticate(data, authIdentityProviderService)
  }
}

export default WorkOSAuthProvider
