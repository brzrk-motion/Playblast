import { Link, useNavigate } from "react-router-dom"
import { useState } from "react"
import { Clapperboard } from "lucide-react"
import { PASSWORD_POLICY } from "@playblast/shared"
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
import {
  isIdentityApiError,
  recoverAdminPassword,
} from "@/lib/identity-api"

export function RecoverAdminPage() {
  const navigate = useNavigate()
  const [recoveryToken, setRecoveryToken] = useState("")
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setSubmitting(true)

    try {
      await recoverAdminPassword({
        recoveryToken,
        email,
        newPassword,
        confirmPassword,
      })
      setRecoveryToken("")
      setNewPassword("")
      setConfirmPassword("")
      setSuccess(true)
    } catch (submitError) {
      if (isIdentityApiError(submitError)) {
        if (submitError.code === "RATE_LIMITED") {
          setError("Too many recovery attempts. Wait and try again later.")
        } else if (submitError.details) {
          setFieldErrors(submitError.details)
          setError(submitError.message)
        } else {
          setError(submitError.message)
        }
      } else {
        setError("Could not reach the server. Try again shortly.")
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg">
              <Clapperboard className="size-5" />
            </div>
            <div>
              <CardTitle>Admin recovery</CardTitle>
              <CardDescription>
                Reset a lost admin password using your deployment recovery token.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-4">
              <p className="text-sm">
                Admin password reset succeeded. All existing admin sessions were
                invalidated. Sign in with the new password.
              </p>
              <Button className="w-full" onClick={() => navigate("/login")}>
                Go to sign in
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={handleSubmit} noValidate>
              <p className="text-muted-foreground text-sm">
                Set <code className="text-xs">PLAYBLAST_ADMIN_RECOVERY_TOKEN</code> in
                your deployment environment. This path works without SMTP.
              </p>
              <div className="space-y-2">
                <Label htmlFor="recovery-token">Recovery token</Label>
                <Input
                  id="recovery-token"
                  type="password"
                  autoComplete="off"
                  value={recoveryToken}
                  onChange={(event) => setRecoveryToken(event.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="recovery-email">Admin email</Label>
                <Input
                  id="recovery-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                {fieldErrors.email?.map((message) => (
                  <p key={message} className="text-destructive text-sm">
                    {message}
                  </p>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="recovery-password">New password</Label>
                <Input
                  id="recovery-password"
                  type="password"
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  required
                />
                {fieldErrors.password?.map((message) => (
                  <p key={message} className="text-destructive text-sm">
                    {message}
                  </p>
                ))}
              </div>
              <div className="space-y-2">
                <Label htmlFor="recovery-confirm-password">Confirm password</Label>
                <Input
                  id="recovery-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  required
                />
                {fieldErrors.confirmPassword?.map((message) => (
                  <p key={message} className="text-destructive text-sm">
                    {message}
                  </p>
                ))}
              </div>
              {error ? (
                <p className="text-destructive text-sm" role="alert">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Resetting password..." : "Reset admin password"}
              </Button>
              <p className="text-muted-foreground text-xs">
                Use at least {PASSWORD_POLICY.minLength} characters with letters and numbers.
              </p>
              <Button asChild variant="outline" className="w-full">
                <Link to="/login">Back to sign in</Link>
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
