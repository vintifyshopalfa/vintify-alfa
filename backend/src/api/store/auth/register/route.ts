import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import type { IAuthModuleService, ICustomerModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { z } from "zod"
import { hashPassword } from "../../../../modules/security/password"

const RegisterSchema = z.object({
  email: z.string().email("A valid email address is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  first_name: z.string().max(100).optional(),
  last_name: z.string().max(100).optional(),
})

type RegisterBody = z.infer<typeof RegisterSchema>

export const POST = async (req: MedusaRequest<unknown>, res: MedusaResponse) => {
  const parsed = RegisterSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({
      message: "Validation failed",
      errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
    })
  }

  const { email, password, first_name, last_name }: RegisterBody = parsed.data

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
    if (first_name) customerData.first_name = first_name
    if (last_name) customerData.last_name = last_name
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
