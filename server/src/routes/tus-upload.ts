import { Router } from "express"
import { requireCapability } from "../middleware/authorization.js"
import {
  VERSION_UPLOAD_TUS_PATH,
  getVersionUploadTusServer,
  runWithUploadRequestContext,
} from "../tus/version-upload.js"

const tusUploadRouter = Router()

tusUploadRouter.use(requireCapability("media.upload"), async (request, response, next) => {
  try {
    await runWithUploadRequestContext(request, async () => {
      await getVersionUploadTusServer().handle(request, response)
    })
  } catch (error) {
    next(error)
  }
})

export { VERSION_UPLOAD_TUS_PATH }
export default tusUploadRouter
