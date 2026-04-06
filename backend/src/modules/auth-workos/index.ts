import { ModuleProviderExports } from "@medusajs/framework/types"
import WorkOSAuthProvider from "./service"

const services = [WorkOSAuthProvider]

const providerExport: ModuleProviderExports = {
  services,
}

export default providerExport
