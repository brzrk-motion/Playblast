import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

interface PageErrorProps {
  title: string
  message: string
  onRetry?: () => void
  backLink?: { to: string; label: string }
  secondaryAction?: React.ReactNode
}

export function PageError({
  title,
  message,
  onRetry,
  backLink,
  secondaryAction,
}: PageErrorProps) {
  return (
    <div className="space-y-4">
      {backLink ? (
        <Button variant="ghost" asChild>
          <Link to={backLink.to}>
            <ArrowLeft />
            {backLink.label}
          </Link>
        </Button>
      ) : null}
      <Card
        className="border-destructive/30 bg-destructive/5"
        role="alert"
        aria-live="assertive"
      >
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription className="text-destructive">{message}</CardDescription>
        </CardHeader>
        {(onRetry || secondaryAction) && (
          <CardContent className="flex flex-wrap gap-2">
            {onRetry ? (
              <Button variant="outline" onClick={onRetry}>
                Try again
              </Button>
            ) : null}
            {secondaryAction}
          </CardContent>
        )}
      </Card>
    </div>
  )
}
