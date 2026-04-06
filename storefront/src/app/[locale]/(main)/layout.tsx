import { Footer, Header } from "@/components/organisms"
import { TalkJSProvider } from "@/components/organisms/TalkJSProvider/TalkJSProvider"
import { retrieveCustomer } from "@/lib/data/customer"
import { checkRegion } from "@/lib/helpers/check-region"
import { redirect } from "next/navigation"

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode
  params: Promise<{ locale: string }>
}>) {
  const APP_ID = process.env.NEXT_PUBLIC_TALKJS_APP_ID
  const { locale } = await params

  const user = await retrieveCustomer()
  const regionCheck = await checkRegion(locale)

  if (!regionCheck) {
    return redirect("/")
  }

  if (!APP_ID || !user)
    return (
      <>
        <Header />
        {children}
        <Footer />
      </>
    )

  return (
    <>
      <TalkJSProvider appId={APP_ID} userId={user.id}>
        <Header />
        {children}
        <Footer />
      </TalkJSProvider>
    </>
  )
}
