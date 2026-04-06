import { Module } from "@medusajs/framework/utils"
import SocialService from "./service"

export const SOCIAL_MODULE = "social"

export default Module(SOCIAL_MODULE, {
  service: SocialService,
})
