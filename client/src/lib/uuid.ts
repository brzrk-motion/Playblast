/**
 * Generates a RFC 4122 v4 UUID.
 *
 * `crypto.randomUUID()` is only exposed in secure contexts (HTTPS or
 * localhost). When the app is served over plain HTTP by IP — e.g. a NAS at
 * http://192.168.1.18:9000 — it is `undefined`, so we fall back to
 * `crypto.getRandomValues()`, which is available in non-secure contexts.
 */
export function randomUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)

  // Set version (4) and variant (RFC 4122) bits.
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0"))

  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join(""),
  ].join("-")
}
