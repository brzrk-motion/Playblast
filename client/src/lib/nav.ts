import type { LucideIcon } from "lucide-react"
import { FolderKanban, LayoutDashboard, Settings, Users } from "lucide-react"

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
    title: "Team",
    icon: Users,
    url: "/team",
    comingSoon: true,
  },
]

export const navSecondary: NavItem[] = [
  {
    title: "Settings",
    icon: Settings,
    url: "/settings",
    comingSoon: true,
  },
]

export type ComingSoonPageConfig = {
  title: string
  description: string
}

export const comingSoonPages: Record<string, ComingSoonPageConfig> = {
  "/team": {
    title: "Team",
    description: "Invite collaborators and manage workspace members.",
  },
  "/settings": {
    title: "Settings",
    description: "Configure workspace preferences, notifications, and integrations.",
  },
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

  if (pathname === "/") {
    return { title: "Dashboard" }
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
  return pathname === url
}

export function isNavGroupActive(pathname: string, items: NavSubItem[]): boolean {
  return items.some((item) => pathname === item.url)
}
