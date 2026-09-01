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

export function LoginShellPage() {
  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg">
              <Clapperboard className="size-5" />
            </div>
            <div>
              <CardTitle>Sign in</CardTitle>
              <CardDescription>
                Application login is deferred to Phase 2.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            The identity API contract is wired, but password authentication and
            secure sessions are not implemented yet. The server returns{" "}
            <code className="text-xs">UNAUTHENTICATED</code> for{" "}
            <code className="text-xs">GET /api/session</code>.
          </p>
          <Button disabled className="w-full">
            Sign in (Phase 2)
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/setup">Back to setup status</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
