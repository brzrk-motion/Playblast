const VIDEO_MIME_TYPES: Record<string, string> = {
  ".mp4": "video/mp4",
  ".mov": "video/quicktime",
  ".webm": "video/webm",
  ".mkv": "video/x-matroska",
  ".avi": "video/x-msvideo",
  ".m4v": "video/x-m4v",
}

export function getVideoContentType(filename: string): string {
  const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase()
  return VIDEO_MIME_TYPES[ext] ?? "application/octet-stream"
}
