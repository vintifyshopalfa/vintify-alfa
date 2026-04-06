import { algoliasearch } from "algoliasearch"
import * as path from "path"
import * as fs from "fs"
import pg from "pg"

type IndexDefinition = {
  name: string
  settingsKey: string
  defaultSettings: Record<string, unknown>
}

type ProductRow = {
  id: string
  title: string | null
  description: string | null
  handle: string | null
  status: string | null
  thumbnail: string | null
}

type SellerRow = {
  id: string
  name: string | null
  description: string | null
  email: string | null
  store_status: string | null
  country_code: string | null
}

const INDEXES: IndexDefinition[] = [
  {
    name: "products",
    settingsKey: "products",
    defaultSettings: {
      searchableAttributes: ["title", "description", "handle", "categories", "tags"],
      attributesForFaceting: ["status", "categories", "tags"],
    },
  },
  {
    name: "sellers",
    settingsKey: "sellers",
    defaultSettings: {
      searchableAttributes: ["name", "description", "email", "city", "region"],
      attributesForFaceting: ["store_status", "country_code"],
    },
  },
]

async function ensureIndexSettings(
  client: ReturnType<typeof algoliasearch>,
  indexDef: IndexDefinition,
  configPath: string
): Promise<void> {
  const { name: indexName, settingsKey, defaultSettings } = indexDef
  console.log(`[ALGOLIA] Configuring index '${indexName}'...`)

  let indexSettings: Record<string, unknown> = defaultSettings
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as Record<string, unknown>
    if (config[settingsKey] && typeof config[settingsKey] === "object") {
      indexSettings = config[settingsKey] as Record<string, unknown>
    }
  }

  try {
    await client.setSettings({ indexName, indexSettings })
    console.log(`[ALGOLIA] Index '${indexName}' settings applied`)
  } catch (err) {
    console.error(`[ALGOLIA] Failed to configure index '${indexName}':`, (err as Error).message)
    throw err
  }
}

async function seedProductsIndex(
  client: ReturnType<typeof algoliasearch>,
  pgClient: pg.Client
): Promise<void> {
  console.log("[ALGOLIA] Seeding 'products' index from database...")

  const { rows: products } = await pgClient.query<ProductRow>(
    `SELECT id, title, description, handle, status, thumbnail FROM product LIMIT 5000`
  )

  if (products.length === 0) {
    console.log("[ALGOLIA] No products found in database — skipping product seeding")
    return
  }

  const objects = products.map((p) => ({
    objectID: p.id,
    id: p.id,
    title: p.title ?? "",
    description: p.description ?? "",
    handle: p.handle ?? "",
    status: p.status ?? "",
    thumbnail: p.thumbnail ?? null,
  }))

  await client.saveObjects({ indexName: "products", objects })
  console.log(`[ALGOLIA] Seeded ${objects.length} products into 'products' index`)
}

async function seedSellersIndex(
  client: ReturnType<typeof algoliasearch>,
  pgClient: pg.Client
): Promise<void> {
  console.log("[ALGOLIA] Seeding 'sellers' index from database...")

  const { rows: sellers } = await pgClient.query<SellerRow>(
    `SELECT id, name, description, email, store_status, country_code FROM seller LIMIT 5000`
  )

  if (sellers.length === 0) {
    console.log("[ALGOLIA] No sellers found in database — skipping seller seeding")
    return
  }

  const objects = sellers.map((s) => ({
    objectID: s.id,
    id: s.id,
    name: s.name ?? "",
    description: s.description ?? "",
    email: s.email ?? "",
    store_status: s.store_status ?? "",
    country_code: s.country_code ?? "",
  }))

  await client.saveObjects({ indexName: "sellers", objects })
  console.log(`[ALGOLIA] Seeded ${objects.length} sellers into 'sellers' index`)
}

async function initAlgolia() {
  const algoliaApiKey = process.env.ALGOLIA_API_KEY
  const algoliaAppId = process.env.ALGOLIA_APP_ID
  const databaseUrl = process.env.DATABASE_URL

  if (!algoliaApiKey || !algoliaAppId) {
    console.log("[ALGOLIA] Credentials not found — skipping index initialization")
    return
  }

  const client = algoliasearch(algoliaAppId, algoliaApiKey)
  const configPath = path.join(process.cwd(), "algolia-config.json")

  for (const indexDef of INDEXES) {
    try {
      await ensureIndexSettings(client, indexDef, configPath)
    } catch (error) {
      console.error(
        `[ALGOLIA] Failed to configure index '${indexDef.name}':`,
        (error as Error).message
      )
    }
  }

  if (!databaseUrl) {
    console.log("[ALGOLIA] DATABASE_URL not set — skipping data seeding")
    return
  }

  const pgClient = new pg.Client({ connectionString: databaseUrl })
  try {
    await pgClient.connect()
    console.log("[ALGOLIA] Connected to database for initial seeding")

    await seedProductsIndex(client, pgClient)
    await seedSellersIndex(client, pgClient)
  } catch (dbError) {
    console.error("[ALGOLIA] Database seeding failed:", (dbError as Error).message)
  } finally {
    await pgClient.end()
  }
}

initAlgolia()
  .then(() => console.log("[ALGOLIA] Initialization complete"))
  .catch((error: unknown) => console.error("[ALGOLIA] Initialization failed:", error))
