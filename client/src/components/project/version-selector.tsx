import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { VersionStatusBadge } from "@/components/project/version-status-badge"
import { sortVersionsByDate } from "@/lib/versions"
import type { Version } from "@/types/version"
import { cn } from "@/lib/utils"
import { Check, ChevronDown, GitBranch } from "lucide-react"

interface VersionSelectorProps {
  versions: Version[]
  selectedLabel: string | null
  onSelect: (label: string) => void
  disabled?: boolean
}

function formatUploadedAt(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export function VersionSelector({
  versions,
  selectedLabel,
  onSelect,
  disabled = false,
}: VersionSelectorProps) {
  const sortedVersions = sortVersionsByDate(versions)
  const selectedVersion =
    sortedVersions.find((version) => version.label === selectedLabel) ??
    sortedVersions[0]

  if (versions.length === 0) {
    return (
      <Button variant="outline" disabled>
        <GitBranch />
        No versions
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={disabled}>
          <GitBranch />
          {selectedVersion?.label ?? "Select version"}
          <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Versions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sortedVersions.map((version) => (
          <DropdownMenuItem
            key={version.id}
            onClick={() => onSelect(version.label)}
            className={cn(
              "flex items-start justify-between gap-2",
              version.label === selectedVersion?.label && "bg-accent/60",
            )}
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{version.label}</p>
                <VersionStatusBadge status={version.status} className="type-micro" />
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {version.filename}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatUploadedAt(version.uploadedAt)}
              </p>
            </div>
            {version.label === selectedVersion?.label ? (
              <Check className="mt-0.5 size-4 shrink-0" />
            ) : null}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
