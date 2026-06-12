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
        "transition-colors",
        selected
          ? "border-primary/50 bg-primary/5"
          : "hover:border-primary/30 hover:bg-muted/20",
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={() => onSelect(version.label)}
            className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            <CardTitle className="text-base leading-snug">{version.label}</CardTitle>
          </button>
          <VersionStatusBadge status={version.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <button
          type="button"
          onClick={() => onSelect(version.label)}
          className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
        >
          <p className="truncate text-sm text-muted-foreground">{version.filename}</p>
          <p className="text-xs text-muted-foreground">
            Uploaded {formatUploadedAt(version.uploadedAt)}
          </p>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-between"
              disabled={updating}
            >
              Update status
              <ChevronDown className="opacity-60" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>Approval status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {VERSION_STATUS_ORDER.map((status) => (
              <DropdownMenuItem
                key={status}
                onClick={() => onStatusChange(version.id, status)}
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
