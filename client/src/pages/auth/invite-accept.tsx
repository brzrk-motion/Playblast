import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { Clapperboard } from "lucide-react"
import { PASSWORD_POLICY, ROLE_BADGE_TOKENS, ROLE_LABELS } from "@playblast/shared"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PageError } from "@/components/feedback/page-error"
import { PageLoading } from "@/components/feedback/page-loading"
import { useSession } from "@/hooks/use-session"
import {
  acceptInvitation,
  fetchInvitePreview,
  isIdentityApiError,
} from "@/lib/identity-api"
import { UI_STATE_CATALOG } from "@/lib/mvp-contracts"
import { cn } from "@/lib/utils"

export function InviteAcceptPage() {
  const { token = "" } = useParams()
  const navigate = useNavigate()
  const { refresh } = useSession()
  const [loading, setLoading] = useState(true)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [studioName, setStudioName] = useState("")
  const [inviteName, setInviteName] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"creative" | "proofing">("creative")
  const [expiresAt, setExpiresAt] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadPreview() {
      if (!token) {
        setPreviewError("This invitation link is invalid.")
        setLoading(false)
        return
      }

      try {
        const preview = await fetchInvitePreview(token)
        if (cancelled) {
          return
        }
        setStudioName(preview.studioName)
        setInviteName(preview.name)
        setInviteEmail(preview.email)
        setInviteRole(preview.role)
        setExpiresAt(preview.expiresAt)
      } catch (error) {
        if (cancelled) {
          return
        }
        if (isIdentityApiError(error)) {
          const state = UI_STATE_CATALOG.invite_expired.relatedErrorCodes?.includes(
            error.code,
          )
            ? UI_STATE_CATALOG.invite_expired
            : error.code === "DELIVERY_FAILED"
              ? UI_STATE_CATALOG.delivery_failure
              : undefined
          setPreviewError(state?.description ?? error.message)
        } else {
          setPreviewError("This invitation is unavailable.")
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadPreview()
    return () => {
      cancelled = true
    }
  }, [token])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitError(null)
    setFieldErrors({})
    setSubmitting(true)

    try {
      await acceptInvitation(token, { password, confirmPassword })
      setPassword("")
      setConfirmPassword("")
      await refresh()
      navigate("/", { replace: true })
    } catch (error) {
      if (isIdentityApiError(error)) {
        if (error.details) {
          setFieldErrors(error.details)
        }
        setSubmitError(error.message)
      } else {
        setSubmitError("Could not create your account.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <PageLoading label="Checking invitation..." className="flex min-h-svh items-center justify-center p-6">
        <div className="text-muted-foreground text-sm">Checking invitation...</div>
      </PageLoading>
    )
  }

  if (previewError) {
    return (
      <div className="bg-background flex min-h-svh items-center justify-center p-6">
        <PageError title="Invitation unavailable" message={previewError} />
      </div>
    )
  }

  const roleBadge = ROLE_BADGE_TOKENS[inviteRole]

  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg">
              <Clapperboard className="size-5" />
            </div>
            <div>
              <CardTitle>Join {studioName}</CardTitle>
              <CardDescription>Create your Playblast password to continue.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/40 space-y-2 rounded-lg border p-4 text-sm">
            <p>
              <span className="text-muted-foreground">Name:</span> {inviteName}
            </p>
            <p>
              <span className="text-muted-foreground">Email:</span> {inviteEmail}
            </p>
            <p className="flex items-center gap-2">
              <span className="text-muted-foreground">Role:</span>
              <Badge variant="outline" className={cn(roleBadge.className)}>
                {ROLE_LABELS[inviteRole]}
              </Badge>
            </p>
            <p>
              <span className="text-muted-foreground">Expires:</span>{" "}
              {new Date(expiresAt).toLocaleString()}
            </p>
          </div>

          <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
            <div className="space-y-2">
              <Label htmlFor="invite-password">Password</Label>
              <Input
                id="invite-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
              <p className="text-muted-foreground text-xs">
                At least {PASSWORD_POLICY.minLength} characters with letters and numbers.
              </p>
              {fieldErrors.password?.map((message) => (
                <p key={message} className="text-destructive text-xs">
                  {message}
                </p>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-confirm-password">Confirm password</Label>
              <Input
                id="invite-confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete="new-password"
                required
              />
              {fieldErrors.confirmPassword?.map((message) => (
                <p key={message} className="text-destructive text-xs">
                  {message}
                </p>
              ))}
            </div>
            {submitError ? <p className="text-destructive text-sm">{submitError}</p> : null}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating account..." : "Create account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
