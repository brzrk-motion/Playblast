import cors from "cors"
import express from "express"
import apiRouter from "./routes/index.js"

const app = express()
const port = Number(process.env.PORT) || 3001

app.use(cors())
app.use(express.json())
app.use("/api", apiRouter)

app.listen(port, () => {
  console.log(`Playblast server listening on http://localhost:${port}`)
})
