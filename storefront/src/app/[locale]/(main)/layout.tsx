import { Footer, Header } from "@/components/organisms"
import { retrieveCustomer } from "@/lib/data/customer"
import { checkRegion } from "@/lib/helpers/check-region"
import { Session } from "@talkjs/react"
import { redirect } from "next/navigation"
import { NextIntlClientProvider } from "next-intl"
import { getMessages, setRequestLocale } from "next-intl/server"
import { countryToLocale } from "@/i18n/request"

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const APP_ID = process.env.NEXT_PUBLIC_TALKJS_APP_ID
  const { locale: countryCode } = await params

  const locale = countryToLocale(countryCode)
  setRequestLocale(locale)

  const messages = await getMessages()

  const user = await retrieveCustomer()
  const regionCheck = await checkRegion(countryCode)

  if (!regionCheck) {
    return redirect("/")
  }

  const inner = !APP_ID || !user ? (
    <>
      <Header />
      {children}
      <Footer />
    </>
  ) : (
    <Session appId={APP_ID} userId={user.id}>
      <Header />
      {children}
      <Footer />
    </Session>
  )

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {inner}
    </NextIntlClientProvider>
  )
}
