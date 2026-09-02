import type { Request, Response } from "express"
import { sendApiError } from "../lib/api-response.js"
import {
  denyUnlessSameStudio,
  getStudioSessionContext,
  resolveClientStudioId,
  resolveCommentStudioId,
  resolveDeliverableStudioId,
  resolveInvoiceStudioId,
  resolveLeadStudioId,
  resolveMilestoneStudioId,
  resolveProjectStudioId,
  resolveServiceStudioId,
  resolveTaskStudioId,
  resolveTimeLogStudioId,
  resolveVersionStudioId,
  type StudioSessionContext,
} from "../auth/studio-scope.js"

export function requireStudioSession(
  request: Request,
  response: Response,
): StudioSessionContext | null {
  const context = getStudioSessionContext(request)
  if (!context) {
    sendApiError(response, "UNAUTHENTICATED")
    return null
  }

  return context
}

export function requireProjectStudio(
  request: Request,
  response: Response,
  projectId: string,
): StudioSessionContext | null {
  const context = requireStudioSession(request, response)
  if (!context) {
    return null
  }

  if (!denyUnlessSameStudio(response, resolveProjectStudioId(projectId), context.studioId)) {
    return null
  }

  return context
}

export function requireDeliverableStudio(
  request: Request,
  response: Response,
  deliverableId: string,
): StudioSessionContext | null {
  const context = requireStudioSession(request, response)
  if (!context) {
    return null
  }

  if (
    !denyUnlessSameStudio(
      response,
      resolveDeliverableStudioId(deliverableId),
      context.studioId,
    )
  ) {
    return null
  }

  return context
}

export function requireVersionStudio(
  request: Request,
  response: Response,
  versionId: string,
): StudioSessionContext | null {
  const context = requireStudioSession(request, response)
  if (!context) {
    return null
  }

  if (!denyUnlessSameStudio(response, resolveVersionStudioId(versionId), context.studioId)) {
    return null
  }

  return context
}

export function requireCommentStudio(
  request: Request,
  response: Response,
  commentId: string,
): StudioSessionContext | null {
  const context = requireStudioSession(request, response)
  if (!context) {
    return null
  }

  if (!denyUnlessSameStudio(response, resolveCommentStudioId(commentId), context.studioId)) {
    return null
  }

  return context
}

export function requireClientStudio(
  request: Request,
  response: Response,
  clientId: string,
): StudioSessionContext | null {
  const context = requireStudioSession(request, response)
  if (!context) {
    return null
  }

  if (!denyUnlessSameStudio(response, resolveClientStudioId(clientId), context.studioId)) {
    return null
  }

  return context
}

export function requireLeadStudio(
  request: Request,
  response: Response,
  leadId: string,
): StudioSessionContext | null {
  const context = requireStudioSession(request, response)
  if (!context) {
    return null
  }

  if (!denyUnlessSameStudio(response, resolveLeadStudioId(leadId), context.studioId)) {
    return null
  }

  return context
}

export function requireServiceStudio(
  request: Request,
  response: Response,
  serviceId: string,
): StudioSessionContext | null {
  const context = requireStudioSession(request, response)
  if (!context) {
    return null
  }

  if (!denyUnlessSameStudio(response, resolveServiceStudioId(serviceId), context.studioId)) {
    return null
  }

  return context
}

export function requireMilestoneStudio(
  request: Request,
  response: Response,
  milestoneId: string,
): StudioSessionContext | null {
  const context = requireStudioSession(request, response)
  if (!context) {
    return null
  }

  if (!denyUnlessSameStudio(response, resolveMilestoneStudioId(milestoneId), context.studioId)) {
    return null
  }

  return context
}

export function requireTaskStudio(
  request: Request,
  response: Response,
  taskId: string,
): StudioSessionContext | null {
  const context = requireStudioSession(request, response)
  if (!context) {
    return null
  }

  if (!denyUnlessSameStudio(response, resolveTaskStudioId(taskId), context.studioId)) {
    return null
  }

  return context
}

export function requireTimeLogStudio(
  request: Request,
  response: Response,
  timeLogId: string,
): StudioSessionContext | null {
  const context = requireStudioSession(request, response)
  if (!context) {
    return null
  }

  if (!denyUnlessSameStudio(response, resolveTimeLogStudioId(timeLogId), context.studioId)) {
    return null
  }

  return context
}

export function requireInvoiceStudio(
  request: Request,
  response: Response,
  invoiceId: string,
): StudioSessionContext | null {
  const context = requireStudioSession(request, response)
  if (!context) {
    return null
  }

  if (!denyUnlessSameStudio(response, resolveInvoiceStudioId(invoiceId), context.studioId)) {
    return null
  }

  return context
}
