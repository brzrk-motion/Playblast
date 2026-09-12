import type { LucideIcon } from "lucide-react"
import {
  Briefcase,
  Clock,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  Settings,
  TrendingUp,
  UserCog,
  Users,
} from "lucide-react"
import { getVisibleNavItems, NAV_ITEMS, type UserRole } from "@playblast/shared"

export type NavItem = {
  title: string
  url: string
  icon: LucideIcon
}

const NAV_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  projects: FolderKanban,
  pipeline: TrendingUp,
  clients: Users,
  services: Briefcase,
  timesheet: Clock,
  capacity: Gauge,
  team: UserCog,
  settings: Settings,
}

export function getNavItemsForRole(
  role: UserRole | null,
  section: "main" | "secondary",
): NavItem[] {
  if (!role) {
    return []
  }

  return getVisibleNavItems(role, section).flatMap((item) => {
    const icon = NAV_ICONS[item.id]
    if (!icon) {
      return []
    }

    return [{ title: item.title, url: item.url, icon }]
  })
}

export function getPageHeader(pathname: string): { title: string; subtitle?: string } {
  if (pathname.startsWith("/projects/") && pathname.endsWith("/compare")) {
    return { title: "Compare", subtitle: "Side-by-side review" }
  }

  if (/^\/projects\/[^/]+\/deliverables\/[^/]+$/.test(pathname)) {
    return { title: "Deliverable" }
  }

  if (/^\/projects\/[^/]+$/.test(pathname)) {
    return { title: "Project" }
  }

  const matched = NAV_ITEMS.find((item) => {
    if (item.url === "/projects") {
      return pathname === "/projects" || pathname.startsWith("/projects/")
    }
    return pathname === item.url || pathname.startsWith(`${item.url}/`)
  })

  if (matched) {
    const subtitles: Record<string, string> = {
      clients: "Lead & client management",
      services: "Catalog offerings & rates",
      timesheet: "Weekly hours across projects",
      pipeline: "Revenue by project stage",
      capacity: "Active workload & hours remaining",
      team: "Users, roles, and invitations",
    }
    const subtitle = subtitles[matched.id]
    return subtitle ? { title: matched.title, subtitle } : { title: matched.title }
  }

  return { title: "Playblast" }
}

export function isNavItemActive(pathname: string, url: string): boolean {
  if (url === "/projects") {
    return pathname === "/projects" || pathname.startsWith("/projects/")
  }
  if (url === "/clients") {
    return pathname === "/clients" || pathname.startsWith("/clients/")
  }
  if (url === "/services") {
    return pathname === "/services" || pathname.startsWith("/services/")
  }
  if (url === "/timesheet") {
    return pathname === "/timesheet" || pathname.startsWith("/timesheet/")
  }
  if (url === "/pipeline") {
    return pathname === "/pipeline" || pathname.startsWith("/pipeline/")
  }
  if (url === "/capacity") {
    return pathname === "/capacity" || pathname.startsWith("/capacity/")
  }
  if (url === "/team") {
    return pathname === "/team" || pathname.startsWith("/team/")
  }
  return pathname === url
}
