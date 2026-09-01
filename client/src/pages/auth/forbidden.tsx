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

const forbiddenState = UI_STATE_CATALOG.forbidden

export function ForbiddenPage() {
  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{forbiddenState.title}</CardTitle>
          <CardDescription>{forbiddenState.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/">{forbiddenState.primaryAction ?? "Back"}</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
