import { useState } from "react"
import { useNavigate } from "react-router-dom"
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
import { useSession } from "@/hooks/use-session"
import {
  createBootstrapAdmin,
  isIdentityApiError,
} from "@/lib/identity-api"

export function SetupShellPage() {
  const navigate = useNavigate()
  const { state, refresh } = useSession()
  const setupStatus = state.status === "ready" ? state.setup.status : "pending"
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [submitting, setSubmitting] = useState(false)

  if (setupStatus !== "pending") {
    const nextRoute =
      state.status === "ready" ? state.setup.nextRoute : "/setup/studio"
    return (
      <div className="bg-background flex min-h-svh items-center justify-center p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Setup in progress</CardTitle>
            <CardDescription>
              This instance already has a bootstrap admin. Continue setup or sign in.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            <Button onClick={() => navigate(nextRoute)}>Continue setup</Button>
            <Button variant="outline" onClick={() => navigate("/login")}>
              Sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setSubmitting(true)

    try {
      await createBootstrapAdmin({
        name,
        email,
        password,
        confirmPassword,
      })
      setPassword("")
      setConfirmPassword("")
      await refresh()
      navigate("/setup/studio", { replace: true })
    } catch (submitError) {
      if (isIdentityApiError(submitError)) {
        if (submitError.code === "SETUP_ALREADY_COMPLETE") {
          setError("Setup was already completed on another request. Sign in instead.")
        } else if (submitError.code === "RATE_LIMITED") {
          setError("Too many setup attempts. Wait a few minutes and try again.")
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
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg">
              <Clapperboard className="size-5" />
            </div>
            <div>
              <CardTitle>Create admin account</CardTitle>
              <CardDescription>
                Claim this self-hosted Playblast instance with one bootstrap admin.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground text-sm">
            Your studio owns this instance, its media, and its backups. Playblast does
            not host your data centrally.
          </p>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="setup-name">Your name</Label>
              <Input
                id="setup-name"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
              />
              {fieldErrors.name?.map((message) => (
                <p key={message} className="text-destructive text-sm">
                  {message}
                </p>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-email">Email</Label>
              <Input
                id="setup-email"
                type="email"
                autoComplete="email"
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
              <Label htmlFor="setup-password">Password</Label>
              <Input
                id="setup-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
              {fieldErrors.password?.map((message) => (
                <p key={message} className="text-destructive text-sm">
                  {message}
                </p>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="setup-confirm-password">Confirm password</Label>
              <Input
                id="setup-confirm-password"
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
              {submitting ? "Creating account..." : "Create admin account"}
            </Button>
            <p className="text-muted-foreground text-xs">
              Use at least {PASSWORD_POLICY.minLength} characters with letters and numbers.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
