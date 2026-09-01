import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto"
import { authConfig } from "../auth/config.js"

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 12

function deriveEncryptionKey(): Buffer {
  return createHash("sha256")
    .update(authConfig.sessionSecret)
    .update("playblast-smtp-secret-v1")
    .digest()
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, deriveEncryptionKey(), iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, encrypted]).toString("base64url")
}

export function decryptSecret(payload: string): string {
  const buffer = Buffer.from(payload, "base64url")
  const iv = buffer.subarray(0, IV_LENGTH)
  const tag = buffer.subarray(IV_LENGTH, IV_LENGTH + 16)
  const encrypted = buffer.subarray(IV_LENGTH + 16)
  const decipher = createDecipheriv(ALGORITHM, deriveEncryptionKey(), iv)
  decipher.setAuthTag(tag)
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  )
}
