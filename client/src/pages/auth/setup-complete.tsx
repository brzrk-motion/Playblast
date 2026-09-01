import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Clapperboard } from "lucide-react"
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
import { completeStudioSetup, isIdentityApiError } from "@/lib/identity-api"

export function SetupCompletePage() {
  const navigate = useNavigate()
  const { state, refresh } = useSession()
  const sessionStudio = state.status === "ready" ? state.session?.studio : null
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleContinue() {
    setError(null)
    setSubmitting(true)

    try {
      await completeStudioSetup()
      await refresh()
      navigate("/", { replace: true })
    } catch (submitError) {
      if (isIdentityApiError(submitError)) {
        setError(submitError.message)
      } else {
        setError("Could not finish setup. Try again.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg">
              <Clapperboard className="size-5" />
            </div>
            <div>
              <CardTitle>Studio profile saved</CardTitle>
              <CardDescription>
                Team invitations and SMTP configuration are available on the Team page.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {sessionStudio ? (
            <StudioIdentityPreview
              studioName={sessionStudio.name || "Your studio"}
              avatarUrl={sessionStudio.avatarUrl}
            />
          ) : null}
          <p className="text-muted-foreground text-sm">
            Continue into Playblast to review projects with your studio identity in
            the application shell.
          </p>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <Button className="w-full" onClick={() => void handleContinue()} disabled={submitting}>
            {submitting ? "Opening Playblast..." : "Continue to Playblast"}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
