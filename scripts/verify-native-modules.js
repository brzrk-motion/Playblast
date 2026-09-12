#!/usr/bin/env node
"use strict"

const { createRequire } = require("node:module")
const path = require("node:path")

const requireFromRoot = createRequire(
  path.join(__dirname, "..", "package.json"),
)

const runtimeAbi = Number(process.versions.modules)
const nodeVersion = process.version
const nodeMajor = Number(process.versions.node.split(".")[0])
const minimumMajor = 22

if (nodeMajor < minimumMajor) {
  console.error(
    `\nplayblast: Node ${nodeVersion} is below the required major ${minimumMajor}.`,
    `Use Node 22 (see .node-version) to match CI and Docker.\n`,
  )
  process.exit(1)
}

try {
  requireFromRoot("better-sqlite3")
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  const firstLine = message.split("\n")[0]

  console.error(`
playblast: better-sqlite3 failed to load (native module ABI mismatch).

  Runtime: Node ${nodeVersion} (NODE_MODULE_VERSION ${runtimeAbi})
  Error:   ${firstLine}

node_modules was likely installed under a different Node version than the
one running tests. Fix:

  npm rebuild better-sqlite3

Or reinstall under Node 22:

  mise install          # reads .mise.toml / .node-version
  rm -rf node_modules && npm install

Pin locally with .node-version (22) to match CI and Docker.
`)
  process.exit(1)
}
