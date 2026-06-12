import { ThemeModeToggle } from "@/components/layout/theme-mode-toggle"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function SettingsPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="type-page-title">Settings</h2>
        <p className="text-muted-foreground">
          Workspace preferences and appearance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>
            Choose how Playblast looks on this device. Your selection is saved
            automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeModeToggle />
        </CardContent>
      </Card>
    </div>
  )
}
