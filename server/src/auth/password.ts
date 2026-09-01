import { randomBytes, scrypt, scryptSync, timingSafeEqual } from "node:crypto"
import { promisify } from "node:util"
import { PASSWORD_POLICY } from "@playblast/shared"

const scryptAsync = promisify(scrypt)
const SCRYPT_KEY_LENGTH = 64

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function validatePasswordPolicy(password: string): string[] {
  const errors: string[] = []

  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(`Password must be at least ${PASSWORD_POLICY.minLength} characters.`)
  }

  if (PASSWORD_POLICY.requireLetter && !/[A-Za-z]/.test(password)) {
    errors.push("Password must include at least one letter.")
  }

  if (PASSWORD_POLICY.requireNumber && !/\d/.test(password)) {
    errors.push("Password must include at least one number.")
  }

  return errors
}

export function validatePasswordConfirmation(
  password: string,
  confirmPassword: string,
): string[] {
  if (password !== confirmPassword) {
    return ["Passwords do not match."]
  }

  return []
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = (await scryptAsync(password, salt, SCRYPT_KEY_LENGTH)) as Buffer
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`
}

export function hashPasswordSync(password: string): string {
  const salt = randomBytes(16)
  const derived = scryptSync(password, salt, SCRYPT_KEY_LENGTH)
  return `scrypt$${salt.toString("base64")}$${derived.toString("base64")}`
}

export async function verifyPassword(
  password: string,
  passwordHash: string | null,
): Promise<boolean> {
  if (!passwordHash) {
    return false
  }

  const parts = passwordHash.split("$")
  if (parts.length !== 3 || parts[0] !== "scrypt") {
    return false
  }

  const salt = Buffer.from(parts[1]!, "base64")
  const expected = Buffer.from(parts[2]!, "base64")
  const derived = (await scryptAsync(password, salt, expected.length)) as Buffer

  if (derived.length !== expected.length) {
    return false
  }

  return timingSafeEqual(derived, expected)
}
