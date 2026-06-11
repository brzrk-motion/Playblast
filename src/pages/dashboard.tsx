import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Film, GitCompare, FolderOpen, Users } from "lucide-react"

const stats = [
  {
    title: "Active Reviews",
    value: "12",
    change: "+3 this week",
    icon: Film,
    trend: "up",
  },
  {
    title: "Comparisons",
    value: "48",
    change: "+8 this week",
    icon: GitCompare,
    trend: "up",
  },
  {
    title: "Projects",
    value: "7",
    change: "2 in progress",
    icon: FolderOpen,
    trend: "neutral",
  },
  {
    title: "Team Members",
    value: "14",
    change: "1 pending invite",
    icon: Users,
    trend: "neutral",
  },
]

const recentActivity = [
  { id: 1, title: "Hero_v3_graded.mov", action: "Approved", user: "Alex P.", time: "2m ago", status: "approved" },
  { id: 2, title: "Sequence_A_rough.mp4", action: "Review requested", user: "Sam K.", time: "1h ago", status: "pending" },
  { id: 3, title: "VFX_comp_007.exr", action: "Changes requested", user: "Jordan M.", time: "3h ago", status: "changes" },
  { id: 4, title: "Color_final_v2.mov", action: "Uploaded", user: "Alex P.", time: "5h ago", status: "uploaded" },
  { id: 5, title: "Audio_mix_v4.wav", action: "Approved", user: "Taylor R.", time: "1d ago", status: "approved" },
]

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  approved: { label: "Approved", variant: "default" },
  pending: { label: "Pending", variant: "secondary" },
  changes: { label: "Changes", variant: "destructive" },
  uploaded: { label: "Uploaded", variant: "outline" },
}

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Good morning</h2>
        <p className="text-muted-foreground">Here's what's happening with your projects today.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest actions across all your projects</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentActivity.map((item) => {
                const config = statusConfig[item.status]
                return (
                  <div key={item.id} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-2 rounded-full bg-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{item.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.action} by {item.user}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={config.variant}>{config.label}</Badge>
                      <span className="text-xs text-muted-foreground hidden sm:block">{item.time}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
