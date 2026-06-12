import { Monitor, Moon, Sun } from "lucide-react"
import type { Theme } from "@/context/theme-context"
import { useTheme } from "@/hooks/use-theme"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const themeOptions: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
]

export function ThemeModeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <ToggleGroup
      type="single"
      variant="outline"
      spacing={0}
      value={theme}
      onValueChange={(value) => {
        if (value) {
          setTheme(value as Theme)
        }
      }}
      aria-label="Theme"
    >
      {themeOptions.map(({ value, label, icon: Icon }) => (
        <ToggleGroupItem key={value} value={value} aria-label={`${label} mode`}>
          <Icon />
          {label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
