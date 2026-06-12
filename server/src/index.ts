import { createApp } from "./app.js"
import { ensureUploadDir } from "./config/paths.js"

const uploadDir = ensureUploadDir()
const app = createApp()
const port = Number(process.env.PORT) || 3001

app.listen(port, () => {
  console.log(`Playblast server listening on http://localhost:${port}`)
  console.log(`Upload directory: ${uploadDir}`)
})
