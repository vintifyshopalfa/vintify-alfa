import { TabsTrigger } from "@/components/atoms"
import LocalizedClientLink from "@/components/molecules/LocalizedLink/LocalizedLink"

export const TabsList = ({
  list,
  activeTab,
}: {
  list: { label: string; link: string; value?: string }[]
  activeTab: string
}) => {
  return (
    <div className="flex gap-4 w-full">
      {list.map(({ label, link, value }) => {
        const key = value ?? label.toLowerCase()
        return (
          <LocalizedClientLink key={key} href={link}>
            <TabsTrigger isActive={activeTab === key}>
              {label}
            </TabsTrigger>
          </LocalizedClientLink>
        )
      })}
    </div>
  )
}
