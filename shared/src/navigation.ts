import type { UserRole } from "./roles.js"

export const NAV_VISIBILITY = ["visible", "hidden", "disabled"] as const

export type NavVisibility = (typeof NAV_VISIBILITY)[number]

export interface NavItemDefinition {
  id: string
  title: string
  url: string
  section: "main" | "secondary" | "account"
  visibility: Record<UserRole, NavVisibility>
  notes?: string
}

/**
 * Navigation visibility contract. Hidden/disabled UI is not authorization;
 * direct URL access must still be denied server-side.
 */
export const NAV_ITEMS: NavItemDefinition[] = [
  {
    id: "dashboard",
    title: "Dashboard",
    url: "/",
    section: "main",
    visibility: { admin: "visible", creative: "visible", proofing: "visible" },
  },
  {
    id: "projects",
    title: "Projects",
    url: "/projects",
    section: "main",
    visibility: { admin: "visible", creative: "visible", proofing: "visible" },
  },
  {
    id: "pipeline",
    title: "Pipeline",
    url: "/pipeline",
    section: "main",
    visibility: { admin: "visible", creative: "hidden", proofing: "hidden" },
    notes: "Deferred CRM surface; hidden from non-Admin roles.",
  },
  {
    id: "clients",
    title: "Clients",
    url: "/clients",
    section: "main",
    visibility: { admin: "visible", creative: "hidden", proofing: "hidden" },
    notes: "Deferred CRM surface; hidden from non-Admin roles.",
  },
  {
    id: "services",
    title: "Services",
    url: "/services",
    section: "main",
    visibility: { admin: "visible", creative: "hidden", proofing: "hidden" },
    notes: "Deferred operations surface; hidden from non-Admin roles.",
  },
  {
    id: "timesheet",
    title: "Timesheet",
    url: "/timesheet",
    section: "main",
    visibility: { admin: "visible", creative: "hidden", proofing: "hidden" },
    notes: "Deferred operations surface; hidden from non-Admin roles.",
  },
  {
    id: "capacity",
    title: "Capacity",
    url: "/capacity",
    section: "main",
    visibility: { admin: "visible", creative: "hidden", proofing: "hidden" },
    notes: "Deferred operations surface; hidden from non-Admin roles.",
  },
  {
    id: "team",
    title: "Team",
    url: "/team",
    section: "main",
    visibility: { admin: "visible", creative: "hidden", proofing: "hidden" },
    notes: "Admin-only; includes SMTP configuration.",
  },
  {
    id: "settings",
    title: "Settings",
    url: "/settings",
    section: "secondary",
    visibility: { admin: "visible", creative: "visible", proofing: "visible" },
    notes: "Personal/browser prefs; studio SMTP is on Team (Admin-only).",
  },
  {
    id: "profile",
    title: "Profile",
    url: "/profile",
    section: "account",
    visibility: { admin: "visible", creative: "visible", proofing: "visible" },
  },
  {
    id: "logout",
    title: "Log out",
    url: "/logout",
    section: "account",
    visibility: { admin: "visible", creative: "visible", proofing: "visible" },
    notes: "Action route; implemented as account-menu action in Phase 2.",
  },
]

export function getNavVisibility(role: UserRole, itemId: string): NavVisibility {
  const item = NAV_ITEMS.find((entry) => entry.id === itemId)
  if (!item) {
    return "hidden"
  }
  return item.visibility[role]
}

export function getVisibleNavItems(role: UserRole, section?: NavItemDefinition["section"]): NavItemDefinition[] {
  return NAV_ITEMS.filter((item) => {
    if (section && item.section !== section) {
      return false
    }
    return item.visibility[role] === "visible"
  })
}

export function isNavItemReachable(role: UserRole, itemId: string): boolean {
  return getNavVisibility(role, itemId) !== "hidden"
}
