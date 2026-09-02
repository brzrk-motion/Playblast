import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Clapperboard, Mail, UserPlus } from "lucide-react"
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

const ONBOARDING_STEPS = [
  {
    icon: Mail,
    title: "Configure SMTP",
    description:
      "Open Team → SMTP settings and run a test delivery before sending email invitations.",
  },
  {
    icon: UserPlus,
    title: "Invite your team",
    description:
      "Invite Creative and Proofing members from Team. Share the invite link if email is not ready yet.",
  },
  {
    icon: Clapperboard,
    title: "Run a proofing smoke test",
    description:
      "Create a project, upload a version, and complete one comment or approval cycle.",
  },
] as const

export function SetupCompletePage() {
  const navigate = useNavigate()
  const { state, refresh } = useSession()
  const sessionStudio = state.status === "ready" ? state.session?.studio : null
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function finishSetup(target: "/" | "/team") {
    setError(null)
    setSubmitting(true)

    try {
      await completeStudioSetup()
      await refresh()
      navigate(target, { replace: true })
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
                Finish onboarding, then open Playblast for your first review.
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

          <div className="space-y-3">
            <p className="text-sm font-medium">Recommended next steps</p>
            <ul className="space-y-3">
              {ONBOARDING_STEPS.map((step) => (
                <li
                  key={step.title}
                  className="border-border flex gap-3 rounded-lg border p-3"
                >
                  <step.icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{step.title}</p>
                    <p className="text-muted-foreground text-sm">{step.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-muted-foreground text-sm">
            Operators manage Docker, backups, and HTTPS. Admins manage team, SMTP, and
            proofing inside Playblast.
          </p>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              className="flex-1"
              onClick={() => void finishSetup("/")}
              disabled={submitting}
            >
              {submitting ? "Opening Playblast..." : "Continue to Playblast"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => void finishSetup("/team")}
              disabled={submitting}
            >
              Open Team first
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
