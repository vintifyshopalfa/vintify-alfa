import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function GET(_req: NextRequest) {
  const cookieStore = await cookies()
  const token = cookieStore.get("_medusa_jwt")?.value

  if (!token) {
    return NextResponse.json({ message: "Unauthenticated" }, { status: 401 })
  }

  const backendUrl = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000"

  const res = await fetch(`${backendUrl}/store/talkjs/token`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
    },
    cache: "no-store",
  }).catch(() => null)

  if (!res || !res.ok) {
    return NextResponse.json({ message: "Failed to fetch TalkJS token" }, { status: 502 })
  }

  const data = await res.json()
  return NextResponse.json(data)
}
