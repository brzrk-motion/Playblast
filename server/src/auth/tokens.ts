import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

export function generateOpaqueToken(byteLength = 32): string {
  return randomBytes(byteLength).toString("base64url")
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function verifyTokenHash(token: string, expectedHash: string): boolean {
  const supplied = Buffer.from(hashToken(token), "hex")
  const expected = Buffer.from(expectedHash, "hex")

  if (supplied.length !== expected.length) {
    return false
  }

  return timingSafeEqual(supplied, expected)
}
