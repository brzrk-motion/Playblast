import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"
import { downloadVersion } from "@/lib/api"
import { cn } from "@/lib/utils"

export interface VersionDownloadButtonProps {
  versionId: string
  disabled?: boolean
  className?: string
}

export function VersionDownloadButton({
  versionId,
  disabled = false,
  className,
}: VersionDownloadButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      className={cn(className)}
      aria-label="Download version"
      onClick={() => {
        downloadVersion(versionId)
      }}
    >
      <Download className="size-4" />
      <span className="hidden sm:inline">Download</span>
    </Button>
  )
}
