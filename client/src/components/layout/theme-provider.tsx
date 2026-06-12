import { useEffect, useState } from "react"
import { ThemeContext, type Theme } from "@/context/theme-context"

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

const STORAGE_KEY = "playblast-theme"

interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
}

export function ThemeProvider({ children, defaultTheme = "system" }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      return (localStorage.getItem(STORAGE_KEY) as Theme) ?? defaultTheme
    } catch {
      return defaultTheme
    }
  })

  const resolvedTheme: "light" | "dark" =
    theme === "system" ? getSystemTheme() : theme

  useEffect(() => {
    const root = document.documentElement

    const apply = (resolved: "light" | "dark") => {
      root.classList.remove("light", "dark")
      root.classList.add(resolved)
    }

    if (theme === "system") {
      apply(getSystemTheme())
      const mq = window.matchMedia("(prefers-color-scheme: dark)")
      const handler = (e: MediaQueryListEvent) => apply(e.matches ? "dark" : "light")
      mq.addEventListener("change", handler)
      return () => mq.removeEventListener("change", handler)
    } else {
      apply(theme)
    }
  }, [theme])

  const setTheme = (next: Theme) => {
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // storage unavailable
    }
    setThemeState(next)
  }

  return (
    <ThemeContext value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext>
  )
}
