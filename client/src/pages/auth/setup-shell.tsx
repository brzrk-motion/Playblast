import { Link } from "react-router-dom"
import { Clapperboard } from "lucide-react"
import { BOOTSTRAP_LIFECYCLE } from "@playblast/shared"
import { useSession } from "@/hooks/use-session"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SetupShellPage() {
  const { state } = useSession()
  const setupStatus = state.status === "ready" ? state.setup.status : "pending"

  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg">
              <Clapperboard className="size-5" />
            </div>
            <div>
              <CardTitle>Playblast setup</CardTitle>
              <CardDescription>
                First-run studio configuration (Phase 2 implements the full flow).
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            This self-hosted instance has not completed setup. The server reports
            status <Badge variant="outline">{setupStatus}</Badge>.
          </p>
          <ol className="space-y-2 text-sm">
            {BOOTSTRAP_LIFECYCLE.map((step) => (
              <li
                key={step.status}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <span>{step.description}</span>
                <Badge variant={step.status === setupStatus ? "default" : "outline"}>
                  {step.status === setupStatus ? "Current" : "Pending"}
                </Badge>
              </li>
            ))}
          </ol>
          <p className="text-muted-foreground text-xs">
            Account creation, studio profile, and team invitations are implemented
            in Phases 2–4. This shell consumes the setup status contract from the
            server.
          </p>
          <Button asChild variant="outline" className="w-full">
            <Link to="/login">Go to login shell</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
