import type { Capability } from "./capabilities.js"

export type ApiRouteAccess =
  | "public"
  | "setup"
  | "authenticated"
  | "admin"

export interface ApiRouteDefinition {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  path: string
  access: ApiRouteAccess
  requiredCapabilities: Capability[]
  notes?: string
}

/**
 * Canonical API route inventory for Phase 5 authorization testing.
 * Paths are full resolved paths (including /api prefix where applicable).
 */
export const API_ROUTES: ApiRouteDefinition[] = [
  { method: "GET", path: "/health", access: "public", requiredCapabilities: [] },
  { method: "GET", path: "/api/setup/status", access: "public", requiredCapabilities: [] },
  { method: "POST", path: "/api/setup/admin", access: "setup", requiredCapabilities: ["setup.complete"] },
  { method: "POST", path: "/api/setup/complete", access: "admin", requiredCapabilities: ["setup.complete"] },
  { method: "POST", path: "/api/auth/login", access: "public", requiredCapabilities: [] },
  { method: "POST", path: "/api/auth/logout", access: "public", requiredCapabilities: [] },
  { method: "POST", path: "/api/auth/recover-admin", access: "public", requiredCapabilities: [] },
  { method: "PATCH", path: "/api/auth/password", access: "authenticated", requiredCapabilities: [] },
  { method: "GET", path: "/api/session", access: "authenticated", requiredCapabilities: [] },
  { method: "GET", path: "/api/capabilities", access: "authenticated", requiredCapabilities: [] },
  { method: "GET", path: "/api/studio", access: "authenticated", requiredCapabilities: ["studio.view"] },
  { method: "PATCH", path: "/api/studio", access: "admin", requiredCapabilities: ["studio.manage"] },
  { method: "POST", path: "/api/studio/avatar", access: "admin", requiredCapabilities: ["studio.manage"] },
  { method: "DELETE", path: "/api/studio/avatar", access: "admin", requiredCapabilities: ["studio.manage"] },
  { method: "GET", path: "/api/studio/avatar", access: "authenticated", requiredCapabilities: ["studio.view"] },
  { method: "GET", path: "/api/users", access: "admin", requiredCapabilities: ["team.manage"] },
  { method: "GET", path: "/api/invitations", access: "admin", requiredCapabilities: ["team.manage"] },
  { method: "GET", path: "/api/smtp", access: "admin", requiredCapabilities: ["settings.smtp"] },
  { method: "PUT", path: "/api/smtp", access: "admin", requiredCapabilities: ["settings.smtp"] },
  { method: "POST", path: "/api/smtp/test", access: "admin", requiredCapabilities: ["settings.smtp"] },
  { method: "POST", path: "/api/invitations", access: "admin", requiredCapabilities: ["team.manage"] },
  { method: "POST", path: "/api/invitations/:invitationId/resend", access: "admin", requiredCapabilities: ["team.manage"] },
  { method: "POST", path: "/api/invitations/:invitationId/revoke", access: "admin", requiredCapabilities: ["team.manage"] },
  { method: "PATCH", path: "/api/users/:userId", access: "admin", requiredCapabilities: ["team.manage"] },
  { method: "GET", path: "/api/invites/:token", access: "public", requiredCapabilities: [] },
  { method: "POST", path: "/api/invites/:token/accept", access: "public", requiredCapabilities: [] },
  { method: "GET", path: "/api/projects", access: "authenticated", requiredCapabilities: ["projects.view"] },
  { method: "POST", path: "/api/projects", access: "authenticated", requiredCapabilities: ["projects.mutate"] },
  { method: "GET", path: "/api/projects/:projectId", access: "authenticated", requiredCapabilities: ["projects.view"] },
  { method: "PATCH", path: "/api/projects/:projectId", access: "authenticated", requiredCapabilities: ["projects.mutate"] },
  { method: "POST", path: "/api/projects/:projectId/duplicate", access: "authenticated", requiredCapabilities: ["projects.mutate"] },
  { method: "POST", path: "/api/projects/:projectId/archive", access: "admin", requiredCapabilities: ["data.delete"] },
  { method: "POST", path: "/api/projects/:projectId/unarchive", access: "admin", requiredCapabilities: ["data.delete"] },
  { method: "DELETE", path: "/api/projects/:projectId", access: "admin", requiredCapabilities: ["data.delete"] },
  { method: "GET", path: "/api/projects/:projectId/versions", access: "authenticated", requiredCapabilities: ["projects.view"] },
  { method: "GET", path: "/api/projects/:projectId/tasks", access: "admin", requiredCapabilities: ["projects.view"] },
  { method: "GET", path: "/api/projects/:projectId/hours-summary", access: "admin", requiredCapabilities: ["projects.view"] },
  { method: "GET", path: "/api/projects/:projectId/deliverables", access: "authenticated", requiredCapabilities: ["projects.view"] },
  { method: "POST", path: "/api/projects/:projectId/deliverables", access: "authenticated", requiredCapabilities: ["projects.mutate"] },
  { method: "GET", path: "/api/deliverables/:deliverableId", access: "authenticated", requiredCapabilities: ["projects.view"] },
  { method: "PATCH", path: "/api/deliverables/:deliverableId", access: "authenticated", requiredCapabilities: ["projects.mutate"] },
  { method: "PATCH", path: "/api/deliverables/:deliverableId/status", access: "authenticated", requiredCapabilities: ["projects.mutate"] },
  { method: "DELETE", path: "/api/deliverables/:deliverableId", access: "admin", requiredCapabilities: ["data.delete"] },
  { method: "GET", path: "/api/deliverables/:deliverableId/versions", access: "authenticated", requiredCapabilities: ["projects.view"] },
  { method: "POST", path: "/api/deliverables/:deliverableId/versions/:version/upload", access: "authenticated", requiredCapabilities: ["media.upload"] },
  { method: "PATCH", path: "/api/versions/:versionId/status", access: "authenticated", requiredCapabilities: ["approval.mutate"] },
  { method: "PATCH", path: "/api/versions/:versionId/label", access: "authenticated", requiredCapabilities: ["media.version"] },
  { method: "GET", path: "/api/versions/:versionId/download", access: "authenticated", requiredCapabilities: ["downloads.read"] },
  { method: "GET", path: "/api/deliverables/:deliverableId/versions/:version/comments", access: "authenticated", requiredCapabilities: ["review.play"] },
  { method: "POST", path: "/api/deliverables/:deliverableId/versions/:version/comments", access: "authenticated", requiredCapabilities: ["comments.create"] },
  { method: "GET", path: "/api/comments", access: "authenticated", requiredCapabilities: ["review.play"] },
  { method: "POST", path: "/api/comments", access: "authenticated", requiredCapabilities: ["comments.create"] },
  { method: "PATCH", path: "/api/comments/:commentId", access: "authenticated", requiredCapabilities: ["comments.create"] },
  { method: "PATCH", path: "/api/comments/:commentId/resolve", access: "authenticated", requiredCapabilities: ["approval.mutate"] },
  { method: "DELETE", path: "/api/comments/:commentId", access: "authenticated", requiredCapabilities: ["comments.create"] },
  { method: "GET", path: "/video/:projectId/:deliverableId/:version/:filename", access: "authenticated", requiredCapabilities: ["review.play"] },
  { method: "GET", path: "/api/leads", access: "admin", requiredCapabilities: ["projects.view"] },
  { method: "POST", path: "/api/leads", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "GET", path: "/api/leads/:id", access: "admin", requiredCapabilities: ["projects.view"] },
  { method: "PATCH", path: "/api/leads/:id", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "DELETE", path: "/api/leads/:id", access: "admin", requiredCapabilities: ["data.delete"] },
  { method: "GET", path: "/api/leads/:id/log", access: "admin", requiredCapabilities: ["projects.view"] },
  { method: "POST", path: "/api/leads/:id/log", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "DELETE", path: "/api/leads/:id/log/:logId", access: "admin", requiredCapabilities: ["data.delete"] },
  { method: "POST", path: "/api/leads/:id/convert", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "GET", path: "/api/clients", access: "admin", requiredCapabilities: ["projects.view"] },
  { method: "POST", path: "/api/clients", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "GET", path: "/api/clients/:id", access: "admin", requiredCapabilities: ["projects.view"] },
  { method: "PATCH", path: "/api/clients/:id", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "DELETE", path: "/api/clients/:id", access: "admin", requiredCapabilities: ["data.delete"] },
  { method: "PATCH", path: "/api/clients/:id/retainer-hours", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "POST", path: "/api/clients/:id/revert-to-lead", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "GET", path: "/api/services", access: "admin", requiredCapabilities: ["projects.view"] },
  { method: "POST", path: "/api/services", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "PUT", path: "/api/services/:id", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "DELETE", path: "/api/services/:id", access: "admin", requiredCapabilities: ["data.delete"] },
  { method: "GET", path: "/api/services/:id/usage", access: "admin", requiredCapabilities: ["projects.view"] },
  { method: "GET", path: "/api/projects/:projectId/milestones", access: "admin", requiredCapabilities: ["projects.view"] },
  { method: "POST", path: "/api/projects/:projectId/milestones", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "PATCH", path: "/api/milestones/:milestoneId", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "DELETE", path: "/api/milestones/:milestoneId", access: "admin", requiredCapabilities: ["data.delete"] },
  { method: "GET", path: "/api/milestones/:milestoneId/tasks", access: "admin", requiredCapabilities: ["projects.view"] },
  { method: "POST", path: "/api/milestones/:milestoneId/tasks", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "PATCH", path: "/api/tasks/:taskId", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "DELETE", path: "/api/tasks/:taskId", access: "admin", requiredCapabilities: ["data.delete"] },
  { method: "GET", path: "/api/tasks/:taskId/time-logs", access: "admin", requiredCapabilities: ["projects.view"] },
  { method: "POST", path: "/api/tasks/:taskId/time-logs", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "PATCH", path: "/api/time-logs/:timeLogId", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "DELETE", path: "/api/time-logs/:timeLogId", access: "admin", requiredCapabilities: ["data.delete"] },
  { method: "GET", path: "/api/timesheet", access: "admin", requiredCapabilities: ["projects.view"] },
  { method: "GET", path: "/api/projects/:projectId/services", access: "admin", requiredCapabilities: ["projects.view"] },
  { method: "POST", path: "/api/projects/:projectId/services", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "PATCH", path: "/api/projects/:projectId/services/:serviceId", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "DELETE", path: "/api/projects/:projectId/services/:serviceId", access: "admin", requiredCapabilities: ["data.delete"] },
  { method: "GET", path: "/api/projects/:projectId/invoices", access: "admin", requiredCapabilities: ["projects.view"] },
  { method: "POST", path: "/api/projects/:projectId/invoices", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "GET", path: "/api/invoices/:invoiceId", access: "admin", requiredCapabilities: ["projects.view"] },
  { method: "PATCH", path: "/api/invoices/:invoiceId", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "GET", path: "/api/invoices/:invoiceId/payments", access: "admin", requiredCapabilities: ["projects.view"] },
  { method: "POST", path: "/api/invoices/:invoiceId/payments", access: "admin", requiredCapabilities: ["projects.mutate"] },
  { method: "GET", path: "/api/invoices/:invoiceId/pdf", access: "admin", requiredCapabilities: ["projects.view"] },
  { method: "GET", path: "/api/invoices/:invoiceId/download", access: "admin", requiredCapabilities: ["downloads.read"] },
]

export function getApiRoutes(): ApiRouteDefinition[] {
  return API_ROUTES
}
