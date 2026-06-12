import { inferCodecHint } from "@/lib/video-format"

export interface VideoFileMetadata {
  duration: number | null
  width: number | null
  height: number | null
  fileSize: number
  mimeType: string
  codec: string | null
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) {
    return "Unknown"
  }

  const total = Math.round(seconds)
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const secs = total % 60

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`
  }

  return `${minutes}:${String(secs).padStart(2, "0")}`
}

export function formatResolution(width: number | null, height: number | null): string {
  if (!width || !height) {
    return "Unknown"
  }

  return `${width}×${height}`
}

export function probeVideoFile(file: File): Promise<VideoFileMetadata> {
  const base: VideoFileMetadata = {
    duration: null,
    width: null,
    height: null,
    fileSize: file.size,
    mimeType: file.type || "Unknown",
    codec: inferCodecHint(file.name, file.type),
  }

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement("video")
    video.preload = "metadata"

    const cleanup = () => {
      video.removeAttribute("src")
      video.load()
      URL.revokeObjectURL(url)
    }

    const timeout = window.setTimeout(() => {
      cleanup()
      resolve(base)
    }, 10_000)

    video.addEventListener(
      "loadedmetadata",
      () => {
        window.clearTimeout(timeout)
        const metadata: VideoFileMetadata = {
          ...base,
          duration: Number.isFinite(video.duration) ? video.duration : null,
          width: video.videoWidth > 0 ? video.videoWidth : null,
          height: video.videoHeight > 0 ? video.videoHeight : null,
        }
        cleanup()
        resolve(metadata)
      },
      { once: true },
    )

    video.addEventListener(
      "error",
      () => {
        window.clearTimeout(timeout)
        cleanup()
        resolve(base)
      },
      { once: true },
    )

    video.src = url
  })
}
