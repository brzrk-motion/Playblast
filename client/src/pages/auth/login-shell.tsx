import { Link, useLocation, useNavigate } from "react-router-dom"
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
import { useSession } from "@/hooks/use-session"
import {
  isIdentityApiError,
  login,
} from "@/lib/identity-api"

const GENERIC_LOGIN_ERROR = "Invalid email or password."

export function LoginShellPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { refresh } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})
  const [submitting, setSubmitting] = useState(false)

  const from =
    (location.state as { from?: string } | null)?.from ?? "/"

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    setSubmitting(true)

    try {
      await login({ email, password })
      setPassword("")
      await refresh()
      navigate(from, { replace: true })
    } catch (submitError) {
      if (isIdentityApiError(submitError)) {
        if (submitError.code === "RATE_LIMITED") {
          setError("Too many sign-in attempts. Wait a few minutes and try again.")
        } else if (submitError.details) {
          setFieldErrors(submitError.details)
          setError(submitError.message)
        } else {
          setError(
            submitError.code === "UNAUTHENTICATED"
              ? GENERIC_LOGIN_ERROR
              : submitError.message,
          )
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
              <CardTitle>Sign in</CardTitle>
              <CardDescription>
                Use your Playblast studio account to continue.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <Input
                id="login-email"
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
              <Label htmlFor="login-password">Password</Label>
              <Input
                id="login-password"
                type="password"
                autoComplete="current-password"
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
            {error ? (
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Signing in..." : "Sign in"}
            </Button>
            <p className="text-muted-foreground text-center text-xs">
              Passwords must be at least {PASSWORD_POLICY.minLength} characters with
              letters and numbers.
            </p>
            <Button asChild variant="outline" className="w-full">
              <Link to="/recover-admin">Admin recovery</Link>
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
