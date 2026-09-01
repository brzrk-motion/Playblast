import { Link } from "react-router-dom"
import { Clapperboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { useSession } from "@/hooks/use-session"

export function SetupStudioPlaceholderPage() {
  const { state } = useSession()
  const studioName =
    state.status === "ready" ? state.session?.studio.name || "Your studio" : "Your studio"

  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Studio profile</CardTitle>
          <CardDescription>
            Studio name and avatar setup ships in Phase 3. Your admin account and session
            are already active.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Signed in as the bootstrap admin for <strong>{studioName}</strong>. Continue
            authentication testing from the login screen or proceed once studio profile
            work lands.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">Open sign in</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export function SetupCompletePlaceholderPage() {
  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg">
              <Clapperboard className="size-5" />
            </div>
            <div>
              <CardTitle>Finish setup</CardTitle>
              <CardDescription>
                Team invitations and SMTP configuration arrive in later phases.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Phase 2 covers authentication only. Studio profile completion will advance
            setup status in Phase 3.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
