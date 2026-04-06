import { algoliasearch } from "algoliasearch"
import * as path from "path"
import * as fs from "fs"

type IndexDefinition = {
  name: string
  settingsKey: string
  defaultSettings: Record<string, unknown>
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

async function ensureIndex(
  client: ReturnType<typeof algoliasearch>,
  indexDef: IndexDefinition,
  configPath: string
): Promise<void> {
  const { name: indexName, settingsKey, defaultSettings } = indexDef
  console.log(`[ALGOLIA] Checking index '${indexName}'...`)

  try {
    await client.getSettings({ indexName })
    console.log(`[ALGOLIA] Index '${indexName}' already exists`)
  } catch (err: unknown) {
    const error = err as { status?: number }
    if (error.status !== 404) throw err

    console.log(`[ALGOLIA] Creating index '${indexName}'...`)

    let indexSettings: Record<string, unknown> = defaultSettings
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as Record<string, unknown>
      if (config[settingsKey] && typeof config[settingsKey] === "object") {
        indexSettings = config[settingsKey] as Record<string, unknown>
      }
    }

    await client.setSettings({ indexName, indexSettings })
    console.log(`[ALGOLIA] Index '${indexName}' created successfully`)
  }
}

async function initAlgolia() {
  const algoliaApiKey = process.env.ALGOLIA_API_KEY
  const algoliaAppId = process.env.ALGOLIA_APP_ID

  if (!algoliaApiKey || !algoliaAppId) {
    console.log("[ALGOLIA] Credentials not found, skipping index initialization")
    return
  }

  const client = algoliasearch(algoliaAppId, algoliaApiKey)
  const configPath = path.join(process.cwd(), "algolia-config.json")

  for (const indexDef of INDEXES) {
    try {
      await ensureIndex(client, indexDef, configPath)
    } catch (error) {
      console.error(`[ALGOLIA] Failed to initialize index '${indexDef.name}': ${(error as Error).message}`)
    }
  }
}

initAlgolia()
  .then(() => console.log("[ALGOLIA] Initialization complete"))
  .catch((error: unknown) => console.error("[ALGOLIA] Initialization failed:", error))
