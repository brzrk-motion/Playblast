import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { VideoPlayer } from "@/components/video/video-player"
import { DEMO_COMMENTS } from "@/lib/demo-comments"

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
        comments={DEMO_COMMENTS}
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
            <CardDescription>
              {DEMO_COMMENTS.length} timestamped comments shown as markers on the scrub bar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {DEMO_COMMENTS.map((comment) => (
              <div key={comment.id} className="space-y-0.5">
                <p className="text-xs font-medium text-foreground">
                  {comment.author}
                  <span className="ml-2 font-normal text-muted-foreground">
                    {Math.floor(comment.timestamp / 60)}:
                    {String(Math.floor(comment.timestamp % 60)).padStart(2, "0")}
                  </span>
                </p>
                <p className="text-sm text-muted-foreground">{comment.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
