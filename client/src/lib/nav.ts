import type { LucideIcon } from "lucide-react"
import {
  Film,
  FolderOpen,
  GitCompare,
  LayoutDashboard,
  Settings,
  Users,
} from "lucide-react"

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
    title: "Reviews",
    icon: Film,
    url: "/reviews",
    items: [
      { title: "All Reviews", url: "/reviews", comingSoon: true },
      { title: "Pending", url: "/reviews/pending", comingSoon: true },
      { title: "Approved", url: "/reviews/approved", comingSoon: true },
    ],
  },
  {
    title: "Comparisons",
    icon: GitCompare,
    url: "/comparisons/ab-compare",
    items: [
      { title: "A/B Compare", url: "/comparisons/ab-compare", comingSoon: true },
      { title: "Version History", url: "/comparisons/version-history", comingSoon: true },
    ],
  },
  {
    title: "Projects",
    icon: FolderOpen,
    url: "/projects",
    comingSoon: true,
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
  "/reviews": {
    title: "All Reviews",
    description:
      "Browse every review across your workspace in one place. Open a project from the dashboard to review videos today.",
  },
  "/reviews/pending": {
    title: "Pending Reviews",
    description:
      "Track versions waiting for feedback or approval. Project-level review is available from each project page.",
  },
  "/reviews/approved": {
    title: "Approved Reviews",
    description:
      "See approved versions across projects. Approval actions are available on individual project review pages.",
  },
  "/comparisons/ab-compare": {
    title: "A/B Compare",
    description:
      "Compare two versions side by side. Open a project and use Compare to review differences between versions.",
  },
  "/comparisons/version-history": {
    title: "Version History",
    description:
      "Browse version timelines across projects. Version lists are available on each project page.",
  },
  "/projects": {
    title: "Projects",
    description:
      "A dedicated projects view is on the way. Browse and create projects from the dashboard in the meantime.",
  },
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

  if (/^\/projects\/[^/]+$/.test(pathname)) {
    return { title: "Project" }
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
  return pathname === url
}

export function isNavGroupActive(pathname: string, items: NavSubItem[]): boolean {
  return items.some((item) => pathname === item.url)
}
