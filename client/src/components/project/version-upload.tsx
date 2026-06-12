import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { uploadVersion, updateVersionLabel } from "@/lib/api"
import {
  dismissToast,
  humanizeApiError,
  showErrorToast,
  showLoadingToast,
  showSuccessToast,
} from "@/lib/toast"
import {
  isValidVersionLabel,
  suggestNextVersionLabel,
} from "@/lib/versions"
import {
  formatDuration,
  formatResolution,
  probeVideoFile,
  type VideoFileMetadata,
} from "@/lib/video-metadata"
import { getPlaybackWarnings, type PlaybackWarning } from "@/lib/video-format"
import type { UploadProgress, UploadResponse } from "@/types/upload"
import type { Version } from "@/types/version"
import { Spinner } from "@/components/ui/spinner"
import {
  AlertTriangle,
  CheckCircle2,
  FileVideo,
  Info,
  RefreshCw,
  Upload,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface VersionUploadProps {
  projectId: string
  versions: Version[]
  onUploaded: () => void
  onSelectVersion: (label: string) => void
}

interface UploadCompleteState {
  response: UploadResponse
  metadata: VideoFileMetadata
  label: string
  versionId: string
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatProgressDetail(progress: UploadProgress): string {
  const transferred = formatFileSize(progress.loaded)
  const total = formatFileSize(progress.total)
  const remaining = formatFileSize(Math.max(0, progress.total - progress.loaded))

  return `${transferred} of ${total} · ${remaining} remaining`
}

function WarningBanner({ warning }: { warning: PlaybackWarning }) {
  const isWarning = warning.severity === "warning"

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2 text-sm",
        isWarning
          ? "border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100"
          : "border-muted-foreground/30 bg-muted/40 text-muted-foreground",
      )}
    >
      {isWarning ? (
        <AlertTriangle className="mt-0.5 size-4 shrink-0" />
      ) : (
        <Info className="mt-0.5 size-4 shrink-0" />
      )}
      <p>{warning.message}</p>
    </div>
  )
}

function MetadataGrid({ metadata }: { metadata: VideoFileMetadata }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
      <div>
        <dt className="text-muted-foreground">Duration</dt>
        <dd className="font-medium">{formatDuration(metadata.duration)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Resolution</dt>
        <dd className="font-medium">
          {formatResolution(metadata.width, metadata.height)}
        </dd>
      </div>
      <div>
        <dt className="text-muted-foreground">File size</dt>
        <dd className="font-medium">{formatFileSize(metadata.fileSize)}</dd>
      </div>
      <div>
        <dt className="text-muted-foreground">Codec</dt>
        <dd className="font-medium">{metadata.codec ?? "Unknown"}</dd>
      </div>
    </dl>
  )
}

export function VersionUpload({
  projectId,
  versions,
  onUploaded,
  onSelectVersion,
}: VersionUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [autoLabel, setAutoLabel] = useState(true)
  const [manualLabel, setManualLabel] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [fileMetadata, setFileMetadata] = useState<VideoFileMetadata | null>(null)
  const [playbackWarnings, setPlaybackWarnings] = useState<PlaybackWarning[]>([])
  const [probingFile, setProbingFile] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadComplete, setUploadComplete] = useState<UploadCompleteState | null>(null)
  const [renaming, setRenaming] = useState(false)
  const [renameLabel, setRenameLabel] = useState("")

  const suggestedLabel = suggestNextVersionLabel(versions)
  const versionLabel = autoLabel ? suggestedLabel : manualLabel.trim()

  const validateFile = useCallback((file: File): string | null => {
    if (!file.type.startsWith("video/") && file.type !== "") {
      return "Please choose a video file."
    }

    return null
  }, [])

  const resetSelection = useCallback(() => {
    setSelectedFile(null)
    setFileMetadata(null)
    setPlaybackWarnings([])
    setProbingFile(false)
    setError(null)
    setUploadProgress(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }, [])

  const handleFile = useCallback(
    async (file: File | null) => {
      if (!file) {
        resetSelection()
        return
      }

      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        resetSelection()
        return
      }

      setError(null)
      setUploadComplete(null)
      setSelectedFile(file)
      setPlaybackWarnings(getPlaybackWarnings(file))
      setProbingFile(true)
      setFileMetadata(null)

      try {
        const metadata = await probeVideoFile(file)
        setFileMetadata(metadata)
      } finally {
        setProbingFile(false)
      }
    },
    [resetSelection, validateFile],
  )

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(true)
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)
    void handleFile(event.dataTransfer.files[0] ?? null)
  }

  async function handleUpload() {
    if (!selectedFile) {
      setError("Choose a video file to upload.")
      return
    }

    if (!versionLabel) {
      setError("Version label is required.")
      return
    }

    if (!isValidVersionLabel(versionLabel)) {
      setError("Version label can only contain letters, numbers, dots, underscores, and hyphens.")
      return
    }

    setUploading(true)
    setUploadProgress(null)
    setError(null)

    const loadingToastId = showLoadingToast(`Uploading ${versionLabel}…`)

    try {
      const response = await uploadVersion(projectId, versionLabel, selectedFile, (progress) => {
        setUploadProgress(progress)
      })

      dismissToast(loadingToastId)
      showSuccessToast("Upload complete")

      const metadata =
        fileMetadata ??
        (await probeVideoFile(selectedFile))

      setUploadComplete({
        response,
        metadata: {
          ...metadata,
          fileSize: response.size,
        },
        label: versionLabel,
        versionId: response.versionId,
      })
      setRenameLabel(versionLabel)
      onSelectVersion(versionLabel)
      onUploaded()
    } catch (err) {
      dismissToast(loadingToastId)
      const message = humanizeApiError(err, "Upload failed")
      setError(message)
      showErrorToast(message)
    } finally {
      setUploading(false)
    }
  }

  async function handleRenameLabel() {
    if (!uploadComplete) {
      return
    }

    const nextLabel = renameLabel.trim()

    if (!nextLabel) {
      setError("Version label is required.")
      return
    }

    if (!isValidVersionLabel(nextLabel)) {
      setError("Version label can only contain letters, numbers, dots, underscores, and hyphens.")
      return
    }

    if (nextLabel === uploadComplete.label) {
      return
    }

    setRenaming(true)
    setError(null)

    try {
      const updated = await updateVersionLabel(uploadComplete.versionId, nextLabel)
      setUploadComplete((current) =>
        current
          ? {
              ...current,
              label: updated.label,
            }
          : null,
      )
      setRenameLabel(updated.label)
      onSelectVersion(updated.label)
      onUploaded()
      showSuccessToast(`Renamed to ${updated.label}`)
    } catch (err) {
      const message = humanizeApiError(err, "Rename failed")
      setError(message)
      showErrorToast(message)
    } finally {
      setRenaming(false)
    }
  }

  function handleDone() {
    setUploadComplete(null)
    resetSelection()
    setRenameLabel("")
  }

  if (uploadComplete) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15">
              <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="min-w-0">
              <CardTitle>Upload complete</CardTitle>
              <CardDescription>
                {uploadComplete.response.filename} uploaded as{" "}
                <strong>{uploadComplete.label}</strong>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <MetadataGrid metadata={uploadComplete.metadata} />

          <div className="space-y-2">
            <label htmlFor="rename-version-label" className="text-sm font-medium">
              Version label
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="rename-version-label"
                value={renameLabel}
                onChange={(event) => setRenameLabel(event.target.value)}
                disabled={renaming}
                placeholder="e.g. v3"
              />
              <Button
                type="button"
                variant="outline"
                disabled={
                  renaming ||
                  !renameLabel.trim() ||
                  renameLabel.trim() === uploadComplete.label
                }
                onClick={() => void handleRenameLabel()}
              >
                {renaming ? (
                  <>
                    <Spinner className="size-4" />
                    Saving…
                  </>
                ) : (
                  "Rename"
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              You can rename this version without re-uploading the file.
            </p>
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button type="button" onClick={handleDone}>
            Upload another version
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Version</CardTitle>
        <CardDescription>
          Drag and drop a video or browse your files. Labels auto-increment by default.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault()
              fileInputRef.current?.click()
            }
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={cn(
            "focus-ring flex min-h-48 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed p-10 text-center transition-interactive sm:min-h-56",
            dragActive
              ? "scale-[1.01] border-primary bg-primary/10 ring-4 ring-primary/20"
              : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30 active:bg-muted/40",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          <div
            className={cn(
              "flex size-14 items-center justify-center rounded-full transition-colors",
              dragActive ? "bg-primary/15" : "bg-muted",
            )}
          >
            <Upload
              className={cn(
                "size-6 transition-colors",
                dragActive ? "text-primary" : "text-muted-foreground",
              )}
            />
          </div>
          <div>
            <p className="text-base font-medium">
              {dragActive ? "Release to upload" : "Drop your video here"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              or click to browse — MP4, MOV, and other video formats
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            disabled={uploading}
            onChange={(event) => void handleFile(event.target.files?.[0] ?? null)}
          />
        </div>

        {selectedFile ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <FileVideo className="size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                    {probingFile ? " · Reading metadata…" : null}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={uploading}
                aria-label="Remove selected file"
                onClick={(event) => {
                  event.stopPropagation()
                  resetSelection()
                }}
              >
                <X />
              </Button>
            </div>

            {fileMetadata ? <MetadataGrid metadata={fileMetadata} /> : null}

            {playbackWarnings.map((warning) => (
              <WarningBanner key={warning.message} warning={warning} />
            ))}
          </div>
        ) : null}

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={autoLabel ? "default" : "outline"}
              size="sm"
              disabled={uploading}
              onClick={() => setAutoLabel(true)}
            >
              Auto-increment
            </Button>
            <Button
              type="button"
              variant={!autoLabel ? "default" : "outline"}
              size="sm"
              disabled={uploading}
              onClick={() => {
                setAutoLabel(false)
                setManualLabel(suggestedLabel)
              }}
            >
              Manual label
            </Button>
          </div>

          <div className="space-y-2">
            <label htmlFor="version-label" className="text-sm font-medium">
              Version label
            </label>
            <Input
              id="version-label"
              value={versionLabel}
              onChange={(event) => setManualLabel(event.target.value)}
              readOnly={autoLabel}
              disabled={uploading}
              placeholder="e.g. v3"
              aria-invalid={error ? true : undefined}
            />
            {autoLabel ? (
              <p className="text-xs text-muted-foreground">
                Next version will be uploaded as <strong>{suggestedLabel}</strong>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Use letters, numbers, dots, underscores, or hyphens.
              </p>
            )}
          </div>
        </div>

        {uploading ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Uploading…</span>
              <span className="font-medium">
                {uploadProgress ? `${uploadProgress.percent}%` : "Starting…"}
              </span>
            </div>
            <Progress value={uploadProgress?.percent ?? 0} />
            {uploadProgress ? (
              <p className="text-xs text-muted-foreground">
                {formatProgressDetail(uploadProgress)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">Preparing upload…</p>
            )}
          </div>
        ) : null}

        {error ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-destructive">{error}</p>
            {selectedFile ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void handleUpload()}
              >
                <RefreshCw className="size-4" />
                Retry upload
              </Button>
            ) : null}
          </div>
        ) : null}

        <Button
          type="button"
          disabled={!selectedFile || uploading || !versionLabel}
          onClick={() => void handleUpload()}
          className="w-full sm:w-auto"
        >
          {uploading ? (
            <>
              <Spinner className="size-4" />
              Uploading…
            </>
          ) : (
            "Upload Version"
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
