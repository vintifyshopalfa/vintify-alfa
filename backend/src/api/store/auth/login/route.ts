import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IAuthModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { z } from "zod"
import { verifyPassword } from "../../../../modules/security/password"

const LoginSchema = z.object({
  email: z.string().email("A valid email address is required"),
  password: z.string().min(1, "Password is required"),
})

type LoginBody = z.infer<typeof LoginSchema>

type ProviderIdentity = {
  provider: string
  entity_id: string
  provider_metadata?: Record<string, unknown>
  auth_identity_id?: string
}

export const POST = async (req: MedusaRequest<unknown>, res: MedusaResponse) => {
  const parsed = LoginSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
    })
  }

  const { email, password }: LoginBody = parsed.data

  try {
    const authModule: IAuthModuleService = req.scope.resolve(Modules.AUTH)

    const identities = await authModule.listProviderIdentities({
      entity_id: email,
      provider: "emailpass",
    }) as ProviderIdentity[]

    if (identities.length === 0) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const identity = identities[0]
    const storedHash = identity.provider_metadata?.password_hash

    if (typeof storedHash !== "string") {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const passwordValid = await verifyPassword(password, storedHash)
    if (!passwordValid) {
      return res.status(401).json({ message: "Invalid email or password" })
    }

    const authIdentityId = identity.auth_identity_id
    if (!authIdentityId) {
      return res.status(500).json({ message: "Authentication error" })
    }

    const authIdentity = await authModule.retrieveAuthIdentity(authIdentityId)

    return res.status(200).json({ auth_identity: { id: authIdentity.id } })
  } catch (error) {
    console.error("[Login] Login failed:", (error as Error).message)
    return res.status(500).json({ message: "Login failed" })
  }
}
