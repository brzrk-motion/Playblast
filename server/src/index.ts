import { createApp } from "./app.js"
import { config } from "./config/env.js"

const app = createApp()

app.listen(config.port, () => {
  console.log(`Playblast server listening on http://localhost:${config.port}`)
})
