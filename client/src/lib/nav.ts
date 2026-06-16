import type { LucideIcon } from "lucide-react"
import { Briefcase, Clock, FolderKanban, LayoutDashboard, Settings, Users } from "lucide-react"

export type NavSubItem = {
  title: string
  url: string
  comingSoon?: boolean
}

export type NavItem = {
  title: string
  url: string
  icon: LucideIcon
  comingSoon?: boolean
  items?: NavSubItem[]
}

export const navMain: NavItem[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    url: "/",
  },
  {
    title: "Projects",
    icon: FolderKanban,
    url: "/projects",
  },
  {
    title: "Clients",
    icon: Users,
    url: "/clients",
  },
  {
    title: "Services",
    icon: Briefcase,
    url: "/services",
  },
  {
    title: "Timesheet",
    icon: Clock,
    url: "/timesheet",
  },
]

export const navSecondary: NavItem[] = [
  {
    title: "Settings",
    icon: Settings,
    url: "/settings",
  },
]

export type ComingSoonPageConfig = {
  title: string
  description: string
}

export const comingSoonPages: Record<string, ComingSoonPageConfig> = {
  "/profile": {
    title: "Profile",
    description: "Manage your account details and personal preferences.",
  },
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

  if (pathname === "/projects") {
    return { title: "Projects" }
  }

  if (pathname === "/clients") {
    return { title: "Clients", subtitle: "Lead & client management" }
  }

  if (pathname === "/services") {
    return { title: "Services", subtitle: "Catalog offerings & rates" }
  }

  if (pathname === "/timesheet") {
    return { title: "Timesheet", subtitle: "Weekly hours across projects" }
  }

  if (pathname === "/") {
    return { title: "Dashboard" }
  }

  if (pathname === "/settings") {
    return { title: "Settings" }
  }

  const comingSoon = comingSoonPages[pathname]
  if (comingSoon) {
    return { title: comingSoon.title }
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
  return pathname === url
}

export function isNavGroupActive(pathname: string, items: NavSubItem[]): boolean {
  return items.some((item) => pathname === item.url)
}
