import { useEffect, useRef, useState } from "react"
import { ImagePlus, Loader2, Trash2 } from "lucide-react"
import { STUDIO_AVATAR_POLICY, STUDIO_NAME_POLICY } from "@playblast/shared"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"
import { validateAvatarFile } from "@/lib/studio-profile"

function getInitials(value: string): string {
  const parts = value.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) {
    return "PB"
  }

  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export interface StudioAvatarFieldProps {
  studioName: string
  avatarUrl: string | null
  disabled?: boolean
  allowDelete?: boolean
  uploading?: boolean
  deleting?: boolean
  uploadProgress?: number | null
  error?: string | null
  onSelectFile: (file: File) => void | Promise<void>
  onDelete?: () => void | Promise<void>
}

export function StudioAvatarField({
  studioName,
  avatarUrl,
  disabled = false,
  allowDelete = true,
  uploading = false,
  deleting = false,
  uploadProgress = null,
  error = null,
  onSelectFile,
  onDelete,
}: StudioAvatarFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
    }
  }, [previewUrl])

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) {
      return
    }

    const validationError = validateAvatarFile(file)
    if (validationError) {
      setLocalError(validationError)
      return
    }

    setLocalError(null)

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(URL.createObjectURL(file))
    await onSelectFile(file)
  }

  const displayUrl = previewUrl ?? avatarUrl
  const busy = uploading || deleting

  return (
    <div className="space-y-3">
      <Label>Studio avatar</Label>
      <div className="flex flex-wrap items-center gap-4">
        <Avatar className="size-16 rounded-lg">
          {displayUrl ? (
            <AvatarImage src={displayUrl} alt={`${studioName} avatar`} className="rounded-lg" />
          ) : null}
          <AvatarFallback className="rounded-lg text-base">
            {getInitials(studioName)}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={disabled || busy}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <ImagePlus className="mr-2 size-4" />
            )}
            {avatarUrl || previewUrl ? "Replace image" : "Upload image"}
          </Button>
          {allowDelete && (avatarUrl || previewUrl) && onDelete ? (
            <Button
              type="button"
              variant="outline"
              disabled={disabled || busy || !avatarUrl}
              onClick={() => void onDelete()}
            >
              {deleting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 size-4" />
              )}
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={STUDIO_AVATAR_POLICY.allowedMimeTypes.join(",")}
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />
      {uploadProgress !== null ? (
        <div className="space-y-2">
          <Progress value={uploadProgress} />
          <p className="text-muted-foreground text-xs">Uploading {uploadProgress}%</p>
        </div>
      ) : null}
      <p className="text-muted-foreground text-xs">
        Optional. JPEG, PNG, WebP, or GIF up to 2 MB.
      </p>
      {error || localError ? (
        <p className="text-destructive text-sm" role="alert">
          {error ?? localError}
        </p>
      ) : null}
    </div>
  )
}

export interface StudioNameFieldProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  error?: string | null
  id?: string
}

export function StudioNameField({
  value,
  onChange,
  disabled = false,
  error = null,
  id = "studio-name",
}: StudioNameFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Studio name</Label>
      <Input
        id={id}
        value={value}
        disabled={disabled}
        maxLength={STUDIO_NAME_POLICY.maxLength}
        onChange={(event) => onChange(event.target.value)}
        required
      />
      <p className="text-muted-foreground text-xs">
        {STUDIO_NAME_POLICY.minLength}–{STUDIO_NAME_POLICY.maxLength} characters.
      </p>
      {error ? (
        <p className="text-destructive text-sm" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

export function StudioIdentityPreview({
  studioName,
  avatarUrl,
  className,
}: {
  studioName: string
  avatarUrl: string | null
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Avatar className="size-12 rounded-lg">
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt={`${studioName} avatar`} className="rounded-lg" />
        ) : null}
        <AvatarFallback className="rounded-lg">{getInitials(studioName)}</AvatarFallback>
      </Avatar>
      <div>
        <p className="font-medium">{studioName}</p>
        <p className="text-muted-foreground text-sm">Studio identity</p>
      </div>
    </div>
  )
}
