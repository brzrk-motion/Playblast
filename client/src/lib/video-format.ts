export interface PlaybackWarning {
  severity: "warning" | "info"
  message: string
}

const PRORES_PATTERN = /prores|apch|apcn|apcs|apco|ap4h|ap4x/i
const DNX_PATTERN = /dnxhd|dnxhr|dnx/i
const HEVC_PATTERN = /hevc|h\.?265|x265/i
const MKV_EXTENSION = /\.mkv$/i
const AVI_EXTENSION = /\.avi$/i
const MOV_EXTENSION = /\.mov$/i
const MXF_EXTENSION = /\.mxf$/i

function getExtension(filename: string): string {
  const dot = filename.lastIndexOf(".")
  return dot === -1 ? "" : filename.slice(dot).toLowerCase()
}

function getBasename(filename: string): string {
  const slash = filename.lastIndexOf("/")
  const basename = slash === -1 ? filename : filename.slice(slash + 1)
  const dot = basename.lastIndexOf(".")
  return dot === -1 ? basename.toLowerCase() : basename.slice(0, dot).toLowerCase()
}

export function inferCodecHint(filename: string, mimeType: string): string | null {
  const name = getBasename(filename)

  if (PRORES_PATTERN.test(name)) return "ProRes"
  if (DNX_PATTERN.test(name)) return "DNxHD/DNxHR"
  if (/h\.?264|avc1|x264/.test(name)) return "H.264"
  if (HEVC_PATTERN.test(name)) return "HEVC"
  if (/vp9/.test(name)) return "VP9"
  if (/av1/.test(name)) return "AV1"

  if (mimeType === "video/webm") return "WebM"
  if (mimeType === "video/mp4") return "MP4"
  if (mimeType === "video/quicktime") return "QuickTime"

  const ext = getExtension(filename)
  if (ext === ".webm") return "WebM"
  if (ext === ".mp4" || ext === ".m4v") return "MP4"

  return null
}

export function getPlaybackWarnings(file: File): PlaybackWarning[] {
  const warnings: PlaybackWarning[] = []
  const name = file.name
  const ext = getExtension(name)
  const basename = getBasename(name)
  const mimeType = file.type.toLowerCase()

  if (PRORES_PATTERN.test(basename) || (MOV_EXTENSION.test(ext) && mimeType === "video/quicktime" && file.size > 50 * 1024 * 1024)) {
    warnings.push({
      severity: "warning",
      message:
        "ProRes and many QuickTime (.mov) codecs may not play back in the browser. Consider uploading an H.264 MP4 for review.",
    })
  }

  if (DNX_PATTERN.test(basename)) {
    warnings.push({
      severity: "warning",
      message:
        "DNxHD/DNxHR files often fail in browser playback. An H.264 or WebM transcode is recommended for proofing.",
    })
  }

  if (MKV_EXTENSION.test(ext)) {
    warnings.push({
      severity: "warning",
      message:
        "MKV container support is limited in browsers. MP4 (H.264) is the most reliable format for review.",
    })
  }

  if (AVI_EXTENSION.test(ext)) {
    warnings.push({
      severity: "warning",
      message:
        "AVI files have inconsistent browser support. MP4 is recommended for reliable playback.",
    })
  }

  if (MXF_EXTENSION.test(ext)) {
    warnings.push({
      severity: "warning",
      message:
        "MXF is a professional broadcast format and is unlikely to play in the browser.",
    })
  }

  if (HEVC_PATTERN.test(basename) || mimeType === "video/hevc" || mimeType === "video/h265") {
    warnings.push({
      severity: "warning",
      message:
        "HEVC (H.265) playback depends on the browser and OS. Safari supports it; Chrome and Firefox often do not.",
    })
  }

  if (MOV_EXTENSION.test(ext) && !warnings.some((warning) => warning.message.includes("QuickTime"))) {
    warnings.push({
      severity: "info",
      message:
        "Some .mov files use codecs that browsers cannot decode. If playback fails, re-export as H.264 MP4.",
    })
  }

  if (!file.type.startsWith("video/") && file.type !== "") {
    warnings.push({
      severity: "warning",
      message:
        "This file does not report a standard video MIME type. Playback may fail even if the extension looks correct.",
    })
  }

  return warnings
}
