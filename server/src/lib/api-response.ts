import type { Response } from "express"
import {
  createApiError,
  getHttpStatusForErrorCode,
  type ApiErrorCode,
  type ApiErrorEnvelope,
} from "@playblast/shared"

export function sendApiError(
  res: Response,
  code: ApiErrorCode,
  message?: string,
  details?: Record<string, string[]>,
): void {
  const envelope: ApiErrorEnvelope = createApiError(code, message, details)
  res.status(getHttpStatusForErrorCode(code)).json(envelope)
}
