import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface DeploymentErrorGuidance {
  title: string
  message: string
  steps: string[]
}

function resolveDeploymentGuidance(message: string): DeploymentErrorGuidance {
  const normalized = message.toLowerCase()

  if (normalized.includes("failed to fetch") || normalized.includes("network")) {
    return {
      title: "Cannot reach Playblast",
      message:
        "The browser could not connect to the Playblast server. This is usually a host, container, or network issue.",
      steps: [
        "Confirm the Playblast container is running and healthy.",
        "Check the host port mapping (default 3000) and firewall rules.",
        "Inspect container logs for startup errors such as a missing SESSION_SECRET.",
        "See docs/deployment/install-linux-nas.md in the repository for operator troubleshooting.",
      ],
    }
  }

  if (normalized.includes("session_secret")) {
    return {
      title: "Server configuration error",
      message:
        "The server rejected startup because SESSION_SECRET is missing or invalid in production.",
      steps: [
        "Set SESSION_SECRET in the deployment .env file to a random string at least 32 characters long.",
        "Restart the container after updating the environment.",
        "See docs/deployment/secrets.md for rotation and backup guidance.",
      ],
    }
  }

  return {
    title: "Server unavailable",
    message,
    steps: [
      "Verify the Playblast container is running.",
      "Check GET /health on the host for database and storage status.",
      "Review container logs for migration or permission errors.",
      "See docs/deployment/README.md in the repository for the full operator guide.",
    ],
  }
}

interface DeploymentErrorPageProps {
  message: string
  onRetry?: () => void
}

export function DeploymentErrorPage({ message, onRetry }: DeploymentErrorPageProps) {
  const guidance = resolveDeploymentGuidance(message)

  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-6">
      <Card className="border-destructive/30 w-full max-w-lg" role="alert">
        <CardHeader>
          <CardTitle>{guidance.title}</CardTitle>
          <CardDescription className="text-destructive">
            {guidance.message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ol className="text-muted-foreground list-decimal space-y-2 pl-5 text-sm">
            {guidance.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-2">
            {onRetry ? (
              <Button variant="outline" onClick={onRetry}>
                Try again
              </Button>
            ) : null}
            <Button variant="ghost" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
