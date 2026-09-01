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
import {
  StudioAvatarField,
  StudioNameField,
} from "@/components/studio/studio-profile-fields"
import { validateStudioNameInput } from "@/lib/studio-profile"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useSession } from "@/hooks/use-session"
import {
  deleteStudioAvatar,
  isIdentityApiError,
  updateStudioProfile,
  uploadStudioAvatar,
} from "@/lib/identity-api"
import {
  getInternalHourlyCostRate,
  setInternalHourlyCostRate,
} from "@/lib/internal-hourly-cost-rate"
import {
  getWeeklyCapacityHours,
  setWeeklyCapacityHours,
} from "@/lib/weekly-capacity"

export function SettingsPage() {
  const { state, role, refresh } = useSession()
  const isAdmin = role === "admin"
  const sessionStudio = state.status === "ready" ? state.session?.studio : null

  const [internalRateInput, setInternalRateInput] = useState(() => {
    const rate = getInternalHourlyCostRate()
    return rate !== null ? String(rate) : ""
  })
  const [weeklyCapacityInput, setWeeklyCapacityInput] = useState(() => {
    const hours = getWeeklyCapacityHours()
    return hours !== null ? String(hours) : ""
  })
  const [saved, setSaved] = useState(false)

  const [draftStudioName, setDraftStudioName] = useState<string | null>(null)
  const [draftAvatarUrl, setDraftAvatarUrl] = useState<string | null | undefined>(undefined)
  const [studioNameError, setStudioNameError] = useState<string | null>(null)
  const [studioAvatarError, setStudioAvatarError] = useState<string | null>(null)
  const [studioFormError, setStudioFormError] = useState<string | null>(null)
  const [studioSaved, setStudioSaved] = useState(false)
  const [studioSaving, setStudioSaving] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarDeleting, setAvatarDeleting] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)

  const studioName = draftStudioName ?? sessionStudio?.name ?? ""
  const avatarUrl =
    draftAvatarUrl === undefined ? sessionStudio?.avatarUrl ?? null : draftAvatarUrl

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

  async function handleSaveStudioProfile() {
    setStudioFormError(null)
    setStudioNameError(null)
    setStudioSaved(false)

    const validationError = validateStudioNameInput(studioName)
    if (validationError) {
      setStudioNameError(validationError)
      return
    }

    setStudioSaving(true)
    try {
      const updated = await updateStudioProfile({ name: studioName.trim() })
      setDraftStudioName(null)
      setDraftAvatarUrl(updated.avatarUrl)
      await refresh()
      setStudioSaved(true)
    } catch (error) {
      if (isIdentityApiError(error)) {
        setStudioNameError(error.details?.name?.[0] ?? null)
        setStudioFormError(error.message)
      } else {
        setStudioFormError("Could not save studio profile.")
      }
    } finally {
      setStudioSaving(false)
    }
  }

  async function handleAvatarUpload(file: File) {
    setStudioAvatarError(null)
    setStudioSaved(false)
    setAvatarUploading(true)
    setUploadProgress(0)

    try {
      const updated = await uploadStudioAvatar(file, (progress) => {
        setUploadProgress(progress.percent)
      })
      setDraftAvatarUrl(updated.avatarUrl)
      await refresh()
      setStudioSaved(true)
    } catch (error) {
      if (isIdentityApiError(error)) {
        setStudioAvatarError(error.details?.avatar?.[0] ?? error.message)
      } else {
        setStudioAvatarError("Avatar upload failed.")
      }
    } finally {
      setAvatarUploading(false)
      setUploadProgress(null)
    }
  }

  async function handleAvatarDelete() {
    setStudioAvatarError(null)
    setStudioSaved(false)
    setAvatarDeleting(true)

    try {
      const updated = await deleteStudioAvatar()
      setDraftAvatarUrl(updated.avatarUrl)
      await refresh()
      setStudioSaved(true)
    } catch (error) {
      if (isIdentityApiError(error)) {
        setStudioAvatarError(error.message)
      } else {
        setStudioAvatarError("Could not remove avatar.")
      }
    } finally {
      setAvatarDeleting(false)
    }
  }

  useEffect(() => {
    if (!saved) {
      return
    }

    const timeout = window.setTimeout(() => setSaved(false), 2000)
    return () => window.clearTimeout(timeout)
  }, [saved])

  useEffect(() => {
    if (!studioSaved) {
      return
    }

    const timeout = window.setTimeout(() => setStudioSaved(false), 2000)
    return () => window.clearTimeout(timeout)
  }, [studioSaved])

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h2 className="type-page-title">Settings</h2>
        <p className="text-muted-foreground">
          Workspace preferences and appearance.
        </p>
      </div>

      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle>Studio profile</CardTitle>
            <CardDescription>
              Update the studio name and avatar shown across the application shell.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <StudioNameField
              id="settings-studio-name"
              value={studioName}
              onChange={setDraftStudioName}
              disabled={studioSaving || avatarUploading || avatarDeleting}
              error={studioNameError}
            />
            <StudioAvatarField
              studioName={studioName.trim() || "Your studio"}
              avatarUrl={avatarUrl}
              disabled={studioSaving || avatarUploading || avatarDeleting}
              uploading={avatarUploading}
              deleting={avatarDeleting}
              uploadProgress={uploadProgress}
              error={studioAvatarError}
              onSelectFile={handleAvatarUpload}
              onDelete={handleAvatarDelete}
            />
            {studioFormError ? (
              <p className="text-destructive text-sm" role="alert">
                {studioFormError}
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={() => void handleSaveStudioProfile()}
                disabled={studioSaving || avatarUploading || avatarDeleting}
              >
                {studioSaving ? "Saving..." : "Save studio profile"}
              </Button>
              {studioSaved ? (
                <p className="text-muted-foreground text-sm">Studio profile saved.</p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : null}

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
