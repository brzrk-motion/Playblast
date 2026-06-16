import { Copy, MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useDuplicateProject } from "@/hooks/use-duplicate-project"

interface ProjectActionsMenuProps {
  projectId: string
  projectName: string
  className?: string
  align?: "start" | "end"
}

export function ProjectActionsMenu({
  projectId,
  projectName,
  className,
  align = "end",
}: ProjectActionsMenuProps) {
  const { duplicate, duplicating } = useDuplicateProject()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={className}
          aria-label={`Actions for ${projectName}`}
          disabled={duplicating}
          onClick={(event) => event.stopPropagation()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <MoreHorizontal className="size-4" />
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
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
