import { useEffect, useState } from "react"
import { ThemeModeToggle } from "@/components/layout/theme-mode-toggle"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  getInternalHourlyCostRate,
  setInternalHourlyCostRate,
} from "@/lib/internal-hourly-cost-rate"
import {
  getWeeklyCapacityHours,
  setWeeklyCapacityHours,
} from "@/lib/weekly-capacity"

export function SettingsPage() {
  const [internalRateInput, setInternalRateInput] = useState(() => {
    const rate = getInternalHourlyCostRate()
    return rate !== null ? String(rate) : ""
  })
  const [weeklyCapacityInput, setWeeklyCapacityInput] = useState(() => {
    const hours = getWeeklyCapacityHours()
    return hours !== null ? String(hours) : ""
  })
  const [saved, setSaved] = useState(false)

  function handleSaveInternalRate() {
    const trimmed = internalRateInput.trim()
    if (!trimmed) {
      setInternalHourlyCostRate(null)
      setSaved(true)
      return
    }

    const parsed = Number.parseFloat(trimmed)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return
    }

    setInternalHourlyCostRate(parsed)
    setSaved(true)
  }

  function handleClearInternalRate() {
    setInternalRateInput("")
    setInternalHourlyCostRate(null)
    setSaved(true)
  }

  function handleSaveWeeklyCapacity() {
    const trimmed = weeklyCapacityInput.trim()
    if (!trimmed) {
      setWeeklyCapacityHours(null)
      setSaved(true)
      return
    }

    const parsed = Number.parseFloat(trimmed)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return
    }

    setWeeklyCapacityHours(parsed)
    setSaved(true)
  }

  function handleClearWeeklyCapacity() {
    setWeeklyCapacityInput("")
    setWeeklyCapacityHours(null)
    setSaved(true)
  }

  useEffect(() => {
    if (!saved) {
      return
    }

    const timeout = window.setTimeout(() => setSaved(false), 2000)
    return () => window.clearTimeout(timeout)
  }, [saved])

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
          <CardTitle>Profitability</CardTitle>
          <CardDescription>
            Set the internal hourly cost rate used to calculate project margins.
            Without a rate, profitability views compare estimated value to billed
            rates only.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="internal-hourly-cost-rate">
              Internal hourly cost rate
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[12rem] flex-1">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="internal-hourly-cost-rate"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="e.g. 120"
                  className="pl-7"
                  value={internalRateInput}
                  onChange={(event) => {
                    setInternalRateInput(event.target.value)
                    setSaved(false)
                  }}
                />
              </div>
              <Button type="button" onClick={handleSaveInternalRate}>
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClearInternalRate}
              >
                Clear
              </Button>
            </div>
            {saved ? (
              <p className="text-sm text-muted-foreground">Saved.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Capacity planning</CardTitle>
          <CardDescription>
            Set your studio&apos;s weekly available hours. The capacity view
            compares total remaining work against this target and warns when you
            may be overloaded.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="weekly-capacity-hours">Weekly capacity (hours)</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="weekly-capacity-hours"
                type="number"
                min="0"
                step="1"
                inputMode="decimal"
                placeholder="e.g. 160"
                className="min-w-[12rem] flex-1"
                value={weeklyCapacityInput}
                onChange={(event) => {
                  setWeeklyCapacityInput(event.target.value)
                  setSaved(false)
                }}
              />
              <Button type="button" onClick={handleSaveWeeklyCapacity}>
                Save
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleClearWeeklyCapacity}
              >
                Clear
              </Button>
            </div>
            {saved ? (
              <p className="text-sm text-muted-foreground">Saved.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>

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
