import type { Meta, StoryObj } from "@storybook/react"

import { Hero } from "./Hero"

const meta: Meta<typeof Hero> = {
  component: Hero,
  decorators: (Story) => <Story />,
}

export default meta
type Story = StoryObj<typeof Hero>

export const FirstStory: Story = {
  args: {
    heading: "Desapegue daquilo que nao usa",
    paragraph: "Compre e venda produtos usados.",
    image: "/images/hero/Image.jpg",
    buttons: [
      { label: "Comprar", path: "#" },
      { label: "Vender", path: "3" },
    ],
  },
}
