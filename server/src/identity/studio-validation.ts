import { STUDIO_AVATAR_POLICY, STUDIO_NAME_POLICY } from "@playblast/shared"

const CONTROL_CHAR_PATTERN = /[\u0000-\u001F\u007F]/

export function validateStudioName(name: string): string[] {
  const trimmed = name.trim()

  if (!trimmed) {
    return ["Studio name is required."]
  }

  if (trimmed.length < STUDIO_NAME_POLICY.minLength) {
    return [`Studio name must be at least ${STUDIO_NAME_POLICY.minLength} characters.`]
  }

  if (trimmed.length > STUDIO_NAME_POLICY.maxLength) {
    return [`Studio name must be ${STUDIO_NAME_POLICY.maxLength} characters or fewer.`]
  }

  if (CONTROL_CHAR_PATTERN.test(trimmed)) {
    return ["Studio name contains invalid characters."]
  }

  return []
}

export function normalizeStudioName(name: string): string {
  return name.trim()
}

export function isAllowedAvatarMimeType(mimeType: string): boolean {
  return (STUDIO_AVATAR_POLICY.allowedMimeTypes as readonly string[]).includes(
    mimeType,
  )
}

export type DetectedImageType = {
  mimeType: string
  extension: string
}

export function detectImageType(buffer: Buffer): DetectedImageType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mimeType: "image/jpeg", extension: "jpg" }
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return { mimeType: "image/png", extension: "png" }
  }

  if (buffer.length >= 6) {
    const header = buffer.subarray(0, 6).toString("ascii")
    if (header === "GIF87a" || header === "GIF89a") {
      return { mimeType: "image/gif", extension: "gif" }
    }
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return { mimeType: "image/webp", extension: "webp" }
  }

  return null
}

export function getAvatarContentType(extension: string): string {
  switch (extension.toLowerCase()) {
    case "jpg":
    case "jpeg":
      return "image/jpeg"
    case "png":
      return "image/png"
    case "gif":
      return "image/gif"
    case "webp":
      return "image/webp"
    default:
      return "application/octet-stream"
  }
}
