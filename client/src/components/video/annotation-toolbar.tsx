import { ArrowUpRight, Eraser, Pencil, Type, Undo2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { AnnotationTool } from "@/types/annotation"

const TOOLS: Array<{ id: AnnotationTool; label: string; icon: typeof Pencil }> = [
  { id: "freehand", label: "Freehand", icon: Pencil },
  { id: "arrow", label: "Arrow", icon: ArrowUpRight },
  { id: "text", label: "Text", icon: Type },
]

export interface AnnotationToolbarProps {
  activeTool: AnnotationTool
  onToolChange: (tool: AnnotationTool) => void
  onUndo: () => void
  onClear: () => void
  canUndo: boolean
  canClear: boolean
  className?: string
}

export function AnnotationToolbar({
  activeTool,
  onToolChange,
  onUndo,
  onClear,
  canUndo,
  canClear,
  className,
}: AnnotationToolbarProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 rounded-lg border border-border/80 bg-surface-overlay p-1 shadow-lg backdrop-blur-sm",
        className,
      )}
      role="toolbar"
      aria-label="Annotation tools"
    >
      {TOOLS.map(({ id, label, icon: Icon }) => (
        <Button
          key={id}
          type="button"
          size="icon-sm"
          variant={activeTool === id ? "secondary" : "ghost"}
          aria-label={label}
          aria-pressed={activeTool === id}
          title={label}
          onClick={() => onToolChange(id)}
        >
          <Icon />
        </Button>
      ))}

      <div className="mx-1 h-5 w-px bg-border" aria-hidden />

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Undo last stroke"
        title="Undo"
        disabled={!canUndo}
        onClick={onUndo}
      >
        <Undo2 />
      </Button>

      <Button
        type="button"
        size="icon-sm"
        variant="ghost"
        aria-label="Clear all annotations"
        title="Clear all"
        disabled={!canClear}
        onClick={onClear}
      >
        <Eraser />
      </Button>
    </div>
  )
}
