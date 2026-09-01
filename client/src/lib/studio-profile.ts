import { STUDIO_AVATAR_POLICY, STUDIO_NAME_POLICY } from "@playblast/shared"

export function validateStudioNameInput(name: string): string | null {
  const trimmed = name.trim()
  if (!trimmed) {
    return "Studio name is required."
  }

  if (trimmed.length < STUDIO_NAME_POLICY.minLength) {
    return `Studio name must be at least ${STUDIO_NAME_POLICY.minLength} characters.`
  }

  if (trimmed.length > STUDIO_NAME_POLICY.maxLength) {
    return `Studio name must be ${STUDIO_NAME_POLICY.maxLength} characters or fewer.`
  }

  return null
}

export function validateAvatarFile(file: File): string | null {
  if (!(STUDIO_AVATAR_POLICY.allowedMimeTypes as readonly string[]).includes(file.type)) {
    return "Use a JPEG, PNG, WebP, or GIF image."
  }

  if (file.size > STUDIO_AVATAR_POLICY.maxSizeBytes) {
    return "Image must be 2 MB or smaller."
  }

  return null
}
