import { Link, NavLink, useLocation, useNavigate } from "react-router-dom"
import {
  ChevronRight,
  Clapperboard,
  ChevronsUpDown,
  LogOut,
  User,
} from "lucide-react"
import {
  ROLE_BADGE_TOKENS,
  type NavItemDefinition,
} from "@playblast/shared"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { useSession } from "@/hooks/use-session"
import { getMvpNavItemsForRole } from "@/lib/mvp-contracts"
import { logout } from "@/lib/identity-api"
import {
  isNavGroupActive,
  isNavItemActive,
  navMain,
  navSecondary,
  type NavItem,
} from "@/lib/nav"

function ComingSoonBadge() {
  return (
    <Badge
      variant="outline"
      className="ml-auto shrink-0 px-1.5 py-0 text-[10px] font-normal text-muted-foreground"
    >
      Soon
    </Badge>
  )
}

export function AppSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const { state, role, refresh } = useSession()

  const sessionUser = state.status === "ready" ? state.session?.user : null
  const sessionStudio = state.status === "ready" ? state.session?.studio : null

  const visibleMainNav = role
    ? filterNavByContract(navMain, getMvpNavItemsForRole(role, "main"))
    : navMain
  const visibleSecondaryNav = role
    ? filterNavByContract(navSecondary, getMvpNavItemsForRole(role, "secondary"))
    : navSecondary

  const studioName = sessionStudio?.name || "Playblast Studio"
  const userName = sessionUser?.name || "Signed-in user"
  const userEmail = sessionUser?.email || "Not signed in"
  const studioAvatarUrl = sessionStudio?.avatarUrl
  const userInitials = getInitials(userName)
  const roleBadge = role ? ROLE_BADGE_TOKENS[role] : null

  async function handleLogout() {
    try {
      await logout()
    } finally {
      await refresh()
      navigate("/login", { replace: true })
    }
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                  <Clapperboard className="size-4" />
                </div>
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold">Playblast</span>
                  <span className="text-muted-foreground text-xs">Project Management</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Application</SidebarGroupLabel>
          <SidebarMenu>
            {visibleMainNav.map((item) =>
              item.items ? (
                <Collapsible
                  key={item.title}
                  asChild
                  defaultOpen={isNavGroupActive(location.pathname, item.items)}
                  className="group/collapsible"
                >
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton tooltip={item.title}>
                        <item.icon />
                        <span>{item.title}</span>
                        <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub>
                        {item.items.map((sub) => (
                          <SidebarMenuSubItem key={sub.url}>
                            <SidebarMenuSubButton
                              asChild
                              isActive={isNavItemActive(location.pathname, sub.url)}
                            >
                              <NavLink
                                to={sub.url}
                                className={cn(sub.comingSoon && "text-muted-foreground")}
                              >
                                <span>{sub.title}</span>
                                {sub.comingSoon ? <ComingSoonBadge /> : null}
                              </NavLink>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        ))}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>
              ) : (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.title}
                    isActive={isNavItemActive(location.pathname, item.url)}
                  >
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className={cn(item.comingSoon && "text-muted-foreground")}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                      {item.comingSoon ? <ComingSoonBadge /> : null}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ),
            )}
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup className="mt-auto">
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarMenu>
            {visibleSecondaryNav.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isNavItemActive(location.pathname, item.url)}
                >
                  <NavLink
                    to={item.url}
                    className={cn(item.comingSoon && "text-muted-foreground")}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                    {item.comingSoon ? <ComingSoonBadge /> : null}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <Avatar className="size-8 rounded-lg">
                    {studioAvatarUrl ? (
                      <AvatarImage
                        src={studioAvatarUrl}
                        alt={`${studioName} avatar`}
                        className="rounded-lg"
                      />
                    ) : null}
                    <AvatarFallback className="rounded-lg">{userInitials}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{studioName}</span>
                    <span className="truncate text-xs text-muted-foreground">
                      {userName}
                    </span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
                side="bottom"
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="size-8 rounded-lg">
                      {studioAvatarUrl ? (
                        <AvatarImage
                          src={studioAvatarUrl}
                          alt={`${studioName} avatar`}
                          className="rounded-lg"
                        />
                      ) : null}
                      <AvatarFallback className="rounded-lg">{userInitials}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{userName}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {userEmail}
                      </span>
                    </div>
                    {roleBadge ? (
                      <Badge variant="outline" className={cn("ml-2", roleBadge.className)}>
                        {roleBadge.label}
                      </Badge>
                    ) : null}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/profile">
                    <User className="mr-2 size-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault()
                    void handleLogout()
                  }}
                >
                  <LogOut className="mr-2 size-4" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return "PB"
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function filterNavByContract(
  items: NavItem[],
  contractItems: NavItemDefinition[],
): NavItem[] {
  const visibleUrls = new Set(contractItems.map((item) => item.url))
  return items.filter((item) => visibleUrls.has(item.url))
}
