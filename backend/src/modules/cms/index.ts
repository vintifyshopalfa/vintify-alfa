import { Module } from "@medusajs/framework/utils"
import CmsService from "./service"

export const CMS_MODULE = "cms"

export default Module(CMS_MODULE, {
  service: CmsService,
})
