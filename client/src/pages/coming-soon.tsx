import { Link, Navigate, useLocation } from "react-router-dom"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { comingSoonPages } from "@/lib/nav"
import { Construction } from "lucide-react"

export function ComingSoonPage() {
  const { pathname } = useLocation()
  const page = comingSoonPages[pathname]

  if (!page) {
    return <Navigate to="/" replace />
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="type-page-title">{page.title}</h2>
          <Badge variant="secondary">Coming soon</Badge>
        </div>
        <p className="text-muted-foreground">{page.description}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted">
              <Construction className="size-5 text-muted-foreground" />
            </div>
            <div>
              <CardTitle className="text-base">This area is under construction</CardTitle>
              <CardDescription>
                The route is ready — functionality will be connected here as it ships.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link to="/">Back to Dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
