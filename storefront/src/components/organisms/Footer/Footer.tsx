import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"
import { getTranslations } from "next-intl/server"

export async function Footer() {
  const t = await getTranslations("footer")

  const customerServiceLinks = [
    { key: "faqs", path: "#" },
    { key: "trackOrder", path: "#" },
    { key: "returns", path: "#" },
    { key: "delivery", path: "#" },
    { key: "payment", path: "#" },
  ]

  const aboutLinks = [
    { key: "aboutUs", path: "#" },
    { key: "blog", path: "#" },
    { key: "privacyPolicy", path: "#" },
    { key: "termsConditions", path: "#" },
  ]

  const connectLinks = [
    { label: "Facebook", path: "https://facebook.com" },
    { label: "Instagram", path: "https://instagram.com" },
    { label: "LinkedIn", path: "https://linkedin.com" },
  ]

  return (
    <footer className="bg-primary container">
      <div className="grid grid-cols-1 lg:grid-cols-3">
        <div className="p-6 border rounded-sm">
          <h2 className="heading-sm text-primary mb-3 uppercase">
            {t("customerServices")}
          </h2>
          <nav className="space-y-3" aria-label="Customer services navigation">
            {customerServiceLinks.map(({ key, path }) => (
              <LocalizedClientLink
                key={key}
                href={path}
                className="block label-md"
              >
                {t(`links.${key}` as any)}
              </LocalizedClientLink>
            ))}
          </nav>
        </div>

        <div className="p-6 border rounded-sm">
          <h2 className="heading-sm text-primary mb-3 uppercase">
            {t("about")}
          </h2>
          <nav className="space-y-3" aria-label="About navigation">
            {aboutLinks.map(({ key, path }) => (
              <LocalizedClientLink
                key={key}
                href={path}
                className="block label-md"
              >
                {t(`links.${key}` as any)}
              </LocalizedClientLink>
            ))}
          </nav>
        </div>

        <div className="p-6 border rounded-sm">
          <h2 className="heading-sm text-primary mb-3 uppercase">
            {t("connect")}
          </h2>
          <nav className="space-y-3" aria-label="Social media navigation">
            {connectLinks.map(({ label, path }) => (
              <a
                aria-label={`Go to ${label} page`}
                title={`Go to ${label} page`}
                key={label}
                href={path}
                className="block label-md"
                target="_blank"
                rel="noopener noreferrer"
              >
                {label}
              </a>
            ))}
          </nav>
        </div>
      </div>

      <div className="py-6 border rounded-sm">
        <p className="text-md text-secondary text-center">{t("copyright")}</p>
      </div>
    </footer>
  )
}
