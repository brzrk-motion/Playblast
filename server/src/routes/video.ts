import fs from "node:fs"
import { Router, type Request, type Response } from "express"
import { getVideoPath } from "../config/paths.js"
import { resolveProjectStudioId } from "../auth/studio-scope.js"
import { sendApiError } from "../lib/api-response.js"
import { getParam } from "../utils/params.js"
import { getVideoContentType } from "../utils/mime.js"

interface VideoParams {
  projectId: string
  deliverableId: string
  version: string
  filename: string
}

const videoRouter = Router({ mergeParams: true })

/**
 * Pipe a file read stream to the response with full lifecycle handling.
 *
 * Without this, a client disconnecting mid-playback (seek, pause, tab close)
 * destroys `res` and the read stream emits an unhandled 'error' event, which
 * crashes the Node process. We tear down the stream on client close and
 * swallow the resulting stream errors instead.
 */
export function pipeVideo(
  res: Response,
  videoPath: string,
  options?: { start: number; end: number },
): void {
  const stream = options
    ? fs.createReadStream(videoPath, options)
    : fs.createReadStream(videoPath)

  const cleanup = () => stream.destroy()
  res.on("close", cleanup)

  stream.on("error", (err: NodeJS.ErrnoException) => {
    res.off("close", cleanup)
    if (res.headersSent) {
      res.destroy()
      return
    }
    if (err.code === "ENOENT") {
      res.status(404).json({ error: "Video not found" })
      return
    }
    res.status(500).json({ error: "Failed to read video" })
  })

  stream.pipe(res)
}

videoRouter.get("/", (req: Request<VideoParams>, res) => {
  const projectId = getParam(req.params.projectId)
  const deliverableId = getParam(req.params.deliverableId)
  const version = getParam(req.params.version)
  const filename = getParam(req.params.filename)

  const sessionStudioId = req.currentSession?.studio.id
  const resourceStudioId = resolveProjectStudioId(projectId)
  if (
    !sessionStudioId ||
    !resourceStudioId ||
    resourceStudioId !== sessionStudioId
  ) {
    sendApiError(res, "NOT_FOUND")
    return
  }

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

    pipeVideo(res, videoPath, { start, end })
    return
  }

  res.status(200)
  res.set({
    "Content-Length": String(fileSize),
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
  })

  pipeVideo(res, videoPath)
})

export default videoRouter
