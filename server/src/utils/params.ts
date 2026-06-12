import type { Request } from "express"

export function getParam(value: string | string[]): string {
  return Array.isArray(value) ? value[0] : value
}

export function getVersionRouteParams(req: Request): {
  projectId: string
  version: string
} {
  const params = req.params as {
    projectId: string | string[]
    version: string | string[]
  }

  return {
    projectId: getParam(params.projectId),
    version: getParam(params.version),
  }
}
