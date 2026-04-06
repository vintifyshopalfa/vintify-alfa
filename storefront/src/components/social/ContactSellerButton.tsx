"use client"

import { useState } from "react"
import { Popup, useSession } from "@talkjs/react"

type ContactSellerButtonProps = {
  sellerId: string
  sellerName: string
  productTitle?: string
}

export function ContactSellerButton({ sellerId, sellerName, productTitle }: ContactSellerButtonProps) {
  const [popupOpen, setPopupOpen] = useState(false)
  const session = useSession()

  if (!session) {
    return (
      <a
        href="/user"
        className="w-full flex items-center justify-center gap-2 border border-gray-300 text-gray-700 font-medium rounded-xl py-3 px-6 hover:bg-gray-50 transition-colors text-sm"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
        Sign in to Contact Seller
      </a>
    )
  }

  const conversationId = `${session.me?.id}-${sellerId}`

  return (
    <>
      <button
        onClick={() => setPopupOpen(true)}
        className="w-full flex items-center justify-center gap-2 font-medium rounded-xl py-3 px-6 transition-all text-sm hover:opacity-90 active:scale-95"
        style={{ backgroundColor: "#09B1BA", color: "#fff" }}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
        Contact Seller
      </button>

      {popupOpen && (
        <Popup
          conversationId={conversationId}
          show={popupOpen}
          onClose={() => setPopupOpen(false)}
        />
      )}
    </>
  )
}
