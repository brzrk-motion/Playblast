import { createApp } from "./app.js"
import { config } from "./config/env.js"
import { ensureUploadDir } from "./config/paths.js"

const uploadDir = ensureUploadDir()
const app = createApp()

app.listen(config.port, () => {
  console.log(`Playblast server listening on http://localhost:${config.port}`)
  console.log(`Upload directory: ${uploadDir}`)
})
