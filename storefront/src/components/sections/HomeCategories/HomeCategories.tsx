import { Carousel } from "@/components/cells"
import { CategoryCard } from "@/components/organisms"

export const categories: { id: number; name: string; handle: string }[] = [
  {
    id: 1,
    name: "Jogos",
    handle: "Jogos",
  },
  {
    id: 2,
    name: "Roupas",
    handle: "Roupas",
  },
  {
    id: 3,
    name: "Eletronicos",
    handle: "Eletronicos",
  },
  {
    id: 4,
    name: "Esportes",
    handle: "Esportes",
  },
  {
    id: 5,
    name: "Acessorios",
    handle: "accessorios",
  },
]

export const HomeCategories = async ({ heading }: { heading: string }) => {
  return (
    <section className="bg-primary py-8 w-full">
      <div className="mb-6">
        <h2 className="heading-lg text-primary uppercase">{heading}</h2>
      </div>
      <Carousel
        items={categories?.map((category) => (
          <CategoryCard key={category.id} category={category} />
        ))}
      />
    </section>
  )
}
