import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { VersionStatusBadge } from "@/components/project/version-status-badge"
import { VERSION_STATUS_LABELS, VERSION_STATUS_ORDER } from "@/lib/versions"
import { cn } from "@/lib/utils"
import type { Version, VersionStatus } from "@/types/version"
import { Spinner } from "@/components/ui/spinner"
import { Check, ChevronDown } from "lucide-react"

interface VersionCardProps {
  version: Version
  selected: boolean
  onSelect: (label: string) => void
  onStatusChange: (versionId: string, status: VersionStatus) => void
  updating?: boolean
}

function formatUploadedAt(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function VersionCard({
  version,
  selected,
  onSelect,
  onStatusChange,
  updating = false,
}: VersionCardProps) {
  return (
    <Card
      className={cn(
        "transition-interactive",
        selected
          ? "border-primary/50 bg-primary/5 shadow-sm"
          : "hover:border-primary/30 hover:bg-muted/20 hover:shadow-sm",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(version.label)}
        aria-pressed={selected}
        className="focus-ring w-full rounded-t-xl text-left active:scale-[0.99] active:bg-muted/20"
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base leading-snug">{version.label}</CardTitle>
            <VersionStatusBadge status={version.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-1 pb-3">
          <p className="truncate text-sm text-muted-foreground">{version.filename}</p>
          <p className="text-xs text-muted-foreground">
            Uploaded {formatUploadedAt(version.uploadedAt)}
          </p>
        </CardContent>
      </button>
      <CardContent className="space-y-3 pt-0">

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between"
              disabled={updating}
              onClick={(event) => event.stopPropagation()}
            >
              {updating ? (
                <>
                  <Spinner className="size-3.5" />
                  Updating…
                </>
              ) : (
                <>
                  Update status
                  <ChevronDown className="opacity-60" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Approval status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {VERSION_STATUS_ORDER.map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={(event) => {
                  event.stopPropagation()
                  onStatusChange(version.id, status)
                }}
                className="flex items-center justify-between gap-2"
              >
                <span>{VERSION_STATUS_LABELS[status]}</span>
                {version.status === status ? (
                  <Check className="size-4 shrink-0" />
                ) : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </CardContent>
    </Card>
  )
}
