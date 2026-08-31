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
  compact?: boolean
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
  compact = false,
}: VersionSelectorProps) {
  const sortedVersions = sortVersionsByDate(versions)
  const selectedVersion =
    sortedVersions.find((version) => version.label === selectedLabel) ??
    sortedVersions[0]

  if (versions.length === 0) {
    return (
      <Button variant="outline" disabled aria-label="No versions available">
        <GitBranch />
        No versions
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={compact ? "sm" : "default"}
          disabled={disabled}
          className={cn(compact && "h-8 gap-1.5 px-2.5")}
          aria-label={`Selected version: ${selectedVersion?.label ?? "none"}`}
        >
          <GitBranch className={cn(compact && "size-3.5")} />
          <span className="max-w-[8rem] truncate sm:max-w-[12rem]">
            {selectedVersion?.label ?? "Select version"}
          </span>
          <ChevronDown className={cn("opacity-60", compact && "size-3.5")} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="type-caption py-1">Versions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {sortedVersions.map((version) => {
          const isSelected = version.label === selectedVersion?.label

          return (
            <DropdownMenuItem
              key={version.id}
              onClick={() => onSelect(version.label)}
              className={cn(
                "relative items-center gap-2 py-1 pr-8",
                isSelected && "bg-accent/60",
              )}
            >
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm leading-tight font-medium">
                    {version.label}
                  </span>
                  <VersionStatusBadge
                    status={version.status}
                    className="type-micro shrink-0 px-1.5"
                  />
                </div>
                <p className="type-caption truncate leading-tight">
                  <span>{formatUploadedAt(version.uploadedAt)}</span>
                  <span aria-hidden="true" className="mx-1 text-muted-foreground/60">
                    ·
                  </span>
                  <span>{version.filename}</span>
                </p>
              </div>
              {isSelected ? (
                <Check className="absolute right-2 size-3.5 shrink-0" />
              ) : null}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
