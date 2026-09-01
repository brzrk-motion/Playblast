import { Link } from "react-router-dom"
import { UI_STATE_CATALOG } from "@playblast/shared"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const sessionExpiredState = UI_STATE_CATALOG.session_expired

export function SessionExpiredPage() {
  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{sessionExpiredState.title}</CardTitle>
          <CardDescription>{sessionExpiredState.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/login">{sessionExpiredState.primaryAction ?? "Sign in"}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
