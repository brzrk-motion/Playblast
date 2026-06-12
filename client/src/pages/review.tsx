import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { VideoPlayer } from "@/components/video/video-player"

const DEMO_PROJECT_ID = "demo-project"
const DEMO_VERSION = "v1"
const DEMO_FILENAME = "sample.mp4"

export function ReviewPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Review</h2>
          <p className="text-muted-foreground">
            Preview and proof video assets with custom playback controls.
          </p>
        </div>
        <Badge variant="secondary">Demo</Badge>
      </div>

      <VideoPlayer
        projectId={DEMO_PROJECT_ID}
        version={DEMO_VERSION}
        filename={DEMO_FILENAME}
        title={DEMO_FILENAME}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Playback</CardTitle>
            <CardDescription>
              Vidstack headless player with shadcn controls
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Play/pause, scrub bar, volume, and fullscreen are wired to the Express video endpoint.</p>
            <p>
              Source:{" "}
              <code className="rounded bg-muted px-1.5 py-0.5 text-xs text-foreground">
                /video/{DEMO_PROJECT_ID}/{DEMO_VERSION}/{DEMO_FILENAME}
              </code>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comments</CardTitle>
            <CardDescription>Timestamped feedback will appear here</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Comment threads and approval workflows are coming in a future update.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
