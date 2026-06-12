import fs from "node:fs"
import { Router, type Request } from "express"
import { getVideoPath } from "../config/paths.js"
import { getParam } from "../utils/params.js"
import { getVideoContentType } from "../utils/mime.js"

interface VideoParams {
  projectId: string
  deliverableId: string
  version: string
  filename: string
}

const videoRouter = Router({ mergeParams: true })

videoRouter.get("/", (req: Request<VideoParams>, res) => {
  const projectId = getParam(req.params.projectId)
  const deliverableId = getParam(req.params.deliverableId)
  const version = getParam(req.params.version)
  const filename = getParam(req.params.filename)

  const videoPath = getVideoPath(projectId, deliverableId, version, filename)
  if (!videoPath) {
    res.status(400).json({ error: "Invalid filename" })
    return
  }

  let stat: fs.Stats
  try {
    stat = fs.statSync(videoPath)
  } catch {
    res.status(404).json({ error: "Video not found" })
    return
  }

  if (!stat.isFile()) {
    res.status(404).json({ error: "Video not found" })
    return
  }

  const fileSize = stat.size
  const contentType = getVideoContentType(filename)
  const range = req.headers.range

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (!match) {
      res.status(416).set("Content-Range", `bytes */${fileSize}`).end()
      return
    }

    const rangeStart = match[1] ? Number.parseInt(match[1], 10) : 0
    const rangeEnd = match[2] ? Number.parseInt(match[2], 10) : fileSize - 1

    if (
      Number.isNaN(rangeStart) ||
      Number.isNaN(rangeEnd) ||
      rangeStart < 0 ||
      rangeEnd < rangeStart ||
      rangeStart >= fileSize
    ) {
      res.status(416).set("Content-Range", `bytes */${fileSize}`).end()
      return
    }

    const start = rangeStart
    const end = Math.min(rangeEnd, fileSize - 1)
    const chunkSize = end - start + 1

    res.status(206)
    res.set({
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": String(chunkSize),
      "Content-Type": contentType,
    })

    fs.createReadStream(videoPath, { start, end }).pipe(res)
    return
  }

  res.status(200)
  res.set({
    "Content-Length": String(fileSize),
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
  })

  fs.createReadStream(videoPath).pipe(res)
})

export default videoRouter
