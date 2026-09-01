import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Clapperboard } from "lucide-react"
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
import { useSession } from "@/hooks/use-session"
import {
  isIdentityApiError,
  updateStudioProfile,
  uploadStudioAvatar,
} from "@/lib/identity-api"

export function SetupStudioPage() {
  const navigate = useNavigate()
  const { state, refresh } = useSession()
  const sessionStudio = state.status === "ready" ? state.session?.studio : null
  const [name, setName] = useState(sessionStudio?.name ?? "")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    sessionStudio?.avatarUrl ?? null,
  )
  const [nameError, setNameError] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [pendingAvatar, setPendingAvatar] = useState<File | null>(null)

  async function handleAvatarSelect(file: File) {
    setAvatarError(null)
    setPendingAvatar(file)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)
    setNameError(null)
    setAvatarError(null)

    const validationError = validateStudioNameInput(name)
    if (validationError) {
      setNameError(validationError)
      return
    }

    setSubmitting(true)

    try {
      const updated = await updateStudioProfile({ name: name.trim() })
      setAvatarUrl(updated.avatarUrl)

      if (pendingAvatar) {
        setUploading(true)
        setUploadProgress(0)
        const uploaded = await uploadStudioAvatar(pendingAvatar, (progress) => {
          setUploadProgress(progress.percent)
        })
        setAvatarUrl(uploaded.avatarUrl)
        setPendingAvatar(null)
      }

      await refresh()
      navigate("/setup/complete", { replace: true })
    } catch (submitError) {
      if (isIdentityApiError(submitError)) {
        if (submitError.details?.name?.[0]) {
          setNameError(submitError.details.name[0])
        }
        if (submitError.details?.avatar?.[0]) {
          setAvatarError(submitError.details.avatar[0])
        }
        setFormError(submitError.message)
      } else {
        setFormError("Could not save studio profile. Try again.")
      }
    } finally {
      setSubmitting(false)
      setUploading(false)
      setUploadProgress(null)
    }
  }

  return (
    <div className="bg-background flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-primary-foreground flex size-10 items-center justify-center rounded-lg">
              <Clapperboard className="size-5" />
            </div>
            <div>
              <CardTitle>Name your studio</CardTitle>
              <CardDescription>
                This identity appears in the sidebar, account menu, and setup flow.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground text-sm">
            Your studio owns this instance, its media, account data, and backups.
            Playblast does not host your data centrally.
          </p>
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <StudioNameField
              value={name}
              onChange={setName}
              disabled={submitting || uploading}
              error={nameError}
            />
            <StudioAvatarField
              studioName={name.trim() || "Your studio"}
              avatarUrl={avatarUrl}
              disabled={submitting || uploading}
              allowDelete={false}
              uploading={uploading}
              uploadProgress={uploadProgress}
              error={avatarError}
              onSelectFile={handleAvatarSelect}
            />
            {formError ? (
              <p className="text-destructive text-sm" role="alert">
                {formError}
              </p>
            ) : null}
            <Button
              type="submit"
              className="w-full"
              disabled={submitting || uploading}
            >
              {submitting || uploading ? "Saving studio profile..." : "Continue"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
