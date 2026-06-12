import type { NextFunction, Request, Response } from "express"
import { getParam } from "../utils/params.js"

export const SAFE_SEGMENT = /^[a-zA-Z0-9._-]+$/

export function validateProjectParams(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const projectId = getParam(req.params.projectId)
  const version = getParam(req.params.version)

  if (!SAFE_SEGMENT.test(projectId) || !SAFE_SEGMENT.test(version)) {
    res.status(400).json({
      error: "projectId and version must contain only letters, numbers, dots, underscores, and hyphens",
    })
    return
  }

  next()
}

export function validateVideoParams(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const projectId = getParam(req.params.projectId)
  const version = getParam(req.params.version)
  const filename = getParam(req.params.filename)

  if (
    !SAFE_SEGMENT.test(projectId) ||
    !SAFE_SEGMENT.test(version) ||
    !SAFE_SEGMENT.test(filename)
  ) {
    res.status(400).json({
      error:
        "projectId, version, and filename must contain only letters, numbers, dots, underscores, and hyphens",
    })
    return
  }

  next()
}
