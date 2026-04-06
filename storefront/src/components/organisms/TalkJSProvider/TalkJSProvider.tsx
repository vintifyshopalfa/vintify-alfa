"use client"

import { Session } from "@talkjs/react"
import type { ReactNode } from "react"

type TalkJSProviderProps = {
  appId: string
  userId: string
  children: ReactNode
}

async function fetchTalkJSToken(userId: string): Promise<string> {
  const res = await fetch("/api/talkjs-token", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
  })
  if (!res.ok) {
    throw new Error("Failed to fetch TalkJS token")
  }
  const data = await res.json()
  return data.token as string
}

export function TalkJSProvider({ appId, userId, children }: TalkJSProviderProps) {
  return (
    <Session
      appId={appId}
      userId={userId}
      tokenFetcher={() => fetchTalkJSToken(userId)}
    >
      {children}
    </Session>
  )
}
