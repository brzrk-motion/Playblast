import path from "node:path"
import { fileURLToPath } from "node:url"
import { test as base, expect } from "@playwright/test"
import { authDir, readRuntimeState } from "../helpers/runtime.js"

const e2eRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")

export const sampleVideoPath = path.join(e2eRoot, "fixtures/assets/sample.mp4")

export type Role = "admin" | "creative" | "proofing"

export function storageStateFor(role: Role): string {
  return path.join(authDir(), `${role}.json`)
}

export const test = base
export { expect }

export function runtime() {
  return readRuntimeState()
}
