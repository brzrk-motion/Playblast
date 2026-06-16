import { Archive, ArchiveRestore, Copy, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { useDuplicateProject } from "@/hooks/use-duplicate-project"

interface ProjectActionsMenuProps {
  projectId: string
  projectName: string
  className?: string
  align?: "start" | "end"
  onArchive?: () => void
  onUnarchive?: () => void
  actionPending?: boolean
}

export function ProjectActionsMenu({
  projectId,
  projectName,
  className,
  align = "end",
  onArchive,
  onUnarchive,
  actionPending = false,
}: ProjectActionsMenuProps) {
  const { duplicate, duplicating } = useDuplicateProject()
  const busy = duplicating || actionPending

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={className}
          aria-label={`Actions for ${projectName}`}
          disabled={busy}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          {busy ? <Spinner className="size-4" /> : <MoreHorizontal className="size-4" />}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenuItem
          disabled={duplicating}
          onClick={() => void duplicate(projectId)}
        >
          <Copy />
          Duplicate project
        </DropdownMenuItem>
        {onArchive || onUnarchive ? <DropdownMenuSeparator /> : null}
        {onArchive ? (
          <DropdownMenuItem
            disabled={actionPending}
            onClick={(event) => {
              event.preventDefault()
              onArchive()
            }}
          >
            <Archive />
            Archive project
          </DropdownMenuItem>
        ) : null}
        {onUnarchive ? (
          <DropdownMenuItem
            disabled={actionPending}
            onClick={(event) => {
              event.preventDefault()
              onUnarchive()
            }}
          >
            <ArchiveRestore />
            Unarchive project
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
