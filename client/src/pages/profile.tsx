import { Link } from "react-router-dom"
import { ROLE_BADGE_TOKENS } from "@playblast/shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { StudioIdentityPreview } from "@/components/studio/studio-profile-fields"
import { useSession } from "@/hooks/use-session"
import { cn } from "@/lib/utils"

export function ProfilePage() {
  const { state, role } = useSession()

  if (state.status !== "ready" || !state.session) {
    return null
  }

  const { user, studio } = state.session
  const roleBadge = role ? ROLE_BADGE_TOKENS[role] : null
  const isAdmin = role === "admin"

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="space-y-2">
        <h2 className="type-page-title">Profile</h2>
        <p className="text-muted-foreground">
          Server-derived account and studio identity for this signed-in session.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your account</CardTitle>
          <CardDescription>Name, email, and role for the current session.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground text-sm">Name</p>
              <p className="font-medium">{user.name}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-sm">Role</p>
              {roleBadge ? (
                <Badge variant="outline" className={cn("mt-1", roleBadge.className)}>
                  {roleBadge.label}
                </Badge>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Studio identity</CardTitle>
          <CardDescription>
            {isAdmin
              ? "Studio profile is managed in Settings."
              : "Read-only studio identity for your account."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <StudioIdentityPreview
            studioName={studio.name || "Playblast Studio"}
            avatarUrl={studio.avatarUrl}
          />
          {isAdmin ? (
            <Button asChild variant="outline">
              <Link to="/settings">Manage studio profile</Link>
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
