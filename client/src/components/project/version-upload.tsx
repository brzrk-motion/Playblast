import { useCallback, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { uploadVersion } from "@/lib/api"
import {
  isValidVersionLabel,
  suggestNextVersionLabel,
} from "@/lib/versions"
import type { UploadProgress } from "@/types/upload"
import type { Version } from "@/types/version"
import { FileVideo, Upload, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface VersionUploadProps {
  projectId: string
  versions: Version[]
  onUploaded: () => void
  onSelectVersion: (label: string) => void
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null)
  const [error, setError] = useState<string | null>(null)

  const suggestedLabel = suggestNextVersionLabel(versions)
  const versionLabel = autoLabel ? suggestedLabel : manualLabel.trim()

  const validateFile = useCallback((file: File): string | null => {
    if (!file.type.startsWith("video/")) {
      return "Please choose a video file."
    }

    return null
  }, [])

  const handleFile = useCallback(
    (file: File | null) => {
      if (!file) {
        setSelectedFile(null)
        return
      }

      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        setSelectedFile(null)
        return
      }

      setError(null)
      setSelectedFile(file)
    },
    [validateFile],
  )

  function handleDragOver(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragActive(true)
  }

  function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragActive(false)
  }

  function handleDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragActive(false)
    handleFile(event.dataTransfer.files[0] ?? null)
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

    try {
      await uploadVersion(projectId, versionLabel, selectedFile, (progress) => {
        setUploadProgress(progress)
      })

      setSelectedFile(null)
      setUploadProgress(null)
      onSelectVersion(versionLabel)
      onUploaded()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
    } finally {
      setUploading(false)
    }
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
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed p-8 text-center transition-colors",
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30",
            uploading && "pointer-events-none opacity-60",
          )}
        >
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Upload className="size-5 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium">Drop your video here</p>
            <p className="text-sm text-muted-foreground">
              or click to browse — MP4, MOV, and other video formats
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            disabled={uploading}
            onChange={(event) => handleFile(event.target.files?.[0] ?? null)}
          />
        </div>

        {selectedFile ? (
          <div className="flex items-center justify-between gap-3 rounded-lg border bg-muted/30 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <FileVideo className="size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
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
                setSelectedFile(null)
              }}
            >
              <X />
            </Button>
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

        {uploading && uploadProgress ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Uploading...</span>
              <span className="font-medium">{uploadProgress.percent}%</span>
            </div>
            <Progress value={uploadProgress.percent} />
          </div>
        ) : null}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button
          type="button"
          disabled={!selectedFile || uploading || !versionLabel}
          onClick={() => void handleUpload()}
          className="w-full sm:w-auto"
        >
          {uploading ? "Uploading..." : "Upload Version"}
        </Button>
      </CardContent>
    </Card>
  )
}
