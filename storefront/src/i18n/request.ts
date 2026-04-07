import { getRequestConfig } from "next-intl/server"

export type AppLocale = "en" | "pt-BR"
export const SUPPORTED_LOCALES: AppLocale[] = ["en", "pt-BR"]
export const DEFAULT_LOCALE: AppLocale = "en"

export function countryToLocale(countryCode: string): AppLocale {
  if (countryCode === "br") return "pt-BR"
  return "en"
}

export default getRequestConfig(async ({ requestLocale }) => {
  const raw = (await requestLocale) ?? DEFAULT_LOCALE
  const locale: AppLocale = SUPPORTED_LOCALES.includes(raw as AppLocale)
    ? (raw as AppLocale)
    : DEFAULT_LOCALE

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
