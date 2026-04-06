import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ICustomerModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import crypto from "crypto"
import { z } from "zod"

const QuerySchema = z.object({}).strict()

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
  const parsed = QuerySchema.safeParse(req.query ?? {})
  if (!parsed.success) {
    return res.status(400).json({
      message: "Unexpected query parameters",
      errors: parsed.error.errors.map((e) => ({ field: e.path.join("."), message: e.message })),
    })
  }

  const appId = process.env.TALKJS_APP_ID
  const secretKey = process.env.TALKJS_SECRET_KEY

  if (!appId || !secretKey) {
    return res.status(503).json({ message: "TalkJS is not configured on this server" })
  }

  const authCtx = req.auth_context
  if (!authCtx?.actor_id) {
    return res.status(401).json({ message: "Authentication required" })
  }

  try {
    const customerService: ICustomerModuleService = req.scope.resolve(Modules.CUSTOMER)
    const customer = await customerService.retrieveCustomer(authCtx.actor_id)

    const now = Math.floor(Date.now() / 1000)
    const payload = {
      tokenType: "user",
      userId: customer.id,
      nbf: now,
      exp: now + 3600,
    }

    const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url")
    const body = Buffer.from(JSON.stringify(payload)).toString("base64url")
    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(`${header}.${body}`)
      .digest("base64url")

    const token = `${header}.${body}.${signature}`

    return res.json({
      token,
      userId: customer.id,
      appId,
      user: {
        id: customer.id,
        name: `${customer.first_name ?? ""} ${customer.last_name ?? ""}`.trim() || customer.email,
        email: customer.email,
        photoUrl: null,
      },
    })
  } catch (error) {
    console.error("[TalkJS] Failed to generate token:", (error as Error).message)
    return res.status(500).json({ message: "Failed to generate TalkJS token" })
  }
}
