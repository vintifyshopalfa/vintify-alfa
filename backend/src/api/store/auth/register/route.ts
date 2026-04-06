import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IAuthModuleService, ICustomerModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { hashPassword } from "../../../../modules/security/password"

type RegisterBody = {
  email?: unknown
  password?: unknown
  first_name?: unknown
  last_name?: unknown
}

export const POST = async (req: MedusaRequest<RegisterBody>, res: MedusaResponse) => {
  const { email, password, first_name, last_name } = req.body ?? {}

  if (typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ message: "A valid email address is required" })
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ message: "Password must be at least 8 characters" })
  }

  try {
    const authModule: IAuthModuleService = req.scope.resolve(Modules.AUTH)
    const customerModule: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER)

    const existing = await authModule.listProviderIdentities({ entity_id: email })
    if (existing.length > 0) {
      return res.status(409).json({ message: "An account with this email already exists" })
    }

    const passwordHash = await hashPassword(password)

    const authIdentity = await authModule.createAuthIdentities({
      provider_identities: [
        {
          provider: "emailpass",
          entity_id: email,
          provider_metadata: { password_hash: passwordHash },
        },
      ],
    })

    const customerData: { email: string; first_name?: string; last_name?: string } = { email }
    if (typeof first_name === "string") customerData.first_name = first_name
    if (typeof last_name === "string") customerData.last_name = last_name
    const customer = await customerModule.createCustomers(customerData)

    return res.status(201).json({
      customer: {
        id: customer.id,
        email: customer.email,
        first_name: customer.first_name,
        last_name: customer.last_name,
      },
      auth_identity_id: authIdentity.id,
    })
  } catch (error) {
    console.error("[Register] Registration failed:", (error as Error).message)
    return res.status(500).json({ message: "Registration failed" })
  }
}
