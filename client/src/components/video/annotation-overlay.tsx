import { useEffect, useState } from "react"
import { useMediaState } from "@vidstack/react"

import { AnnotationShapeView, AnnotationMarkerDefs } from "@/components/video/annotation-shape"
import { AnnotationToolbar } from "@/components/video/annotation-toolbar"
import { Input } from "@/components/ui/input"
import { useAnnotationDrawing } from "@/hooks/use-annotation-drawing"
import { useVideoPlayer } from "@/hooks/use-video-player"
import {
  getVisibleAnnotations,
  mergeAnnotationShapes,
} from "@/lib/annotation"
import { cn } from "@/lib/utils"
import type { AnnotationTool, FrameAnnotation } from "@/types/annotation"
import type { Comment } from "@/types/comment"

export interface AnnotationOverlayProps {
  comments: Comment[]
  className?: string
}

export function AnnotationOverlay({ comments, className }: AnnotationOverlayProps) {
  const paused = useMediaState("paused")
  const { composer, currentTime, setDraftAnnotation } = useVideoPlayer()
  const [activeTool, setActiveTool] = useState<AnnotationTool>("freehand")

  const drawingEnabled = Boolean(composer && paused)

  const {
    overlayRef,
    shapes,
    draftShape,
    pendingTextPoint,
    clearShapes,
    undoLastShape,
    addTextShape,
    cancelPendingText,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    getOverlayRect,
  } = useAnnotationDrawing({
    enabled: drawingEnabled,
    tool: activeTool,
  })

  useEffect(() => {
    if (!composer) {
      clearShapes()
      setDraftAnnotation(null)
      return
    }

    const rect = getOverlayRect()
    const annotation: FrameAnnotation = {
      timestamp: composer.timestamp,
      shapes,
      viewportWidth: rect?.width ?? 1,
      viewportHeight: rect?.height ?? 1,
    }

    setDraftAnnotation(shapes.length > 0 ? annotation : null)
  }, [clearShapes, composer, getOverlayRect, setDraftAnnotation, shapes])

  const visibleSavedShapes = mergeAnnotationShapes(
    getVisibleAnnotations(comments, currentTime),
  )

  const showSavedAnnotations = !drawingEnabled && visibleSavedShapes.length > 0

  return (
    <>
      <svg
        ref={overlayRef}
        className={cn(
          "pointer-events-none absolute inset-0 z-20 h-full w-full",
          drawingEnabled && "pointer-events-auto cursor-crosshair",
          className,
        )}
        viewBox="0 0 1 1"
        preserveAspectRatio="none"
        aria-hidden={!drawingEnabled && !showSavedAnnotations}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <AnnotationMarkerDefs />

        {showSavedAnnotations
          ? visibleSavedShapes.map((shape) => (
              <AnnotationShapeView key={shape.id} shape={shape} />
            ))
          : null}

        {drawingEnabled
          ? shapes.map((shape) => (
              <AnnotationShapeView key={shape.id} shape={shape} />
            ))
          : null}

        {draftShape ? <AnnotationShapeView shape={draftShape} /> : null}
      </svg>

      {drawingEnabled ? (
        <AnnotationToolbar
          className="absolute left-3 top-3 z-30"
          activeTool={activeTool}
          onToolChange={setActiveTool}
          onUndo={undoLastShape}
          onClear={clearShapes}
          canUndo={shapes.length > 0}
          canClear={shapes.length > 0}
        />
      ) : null}

      {drawingEnabled && pendingTextPoint ? (
        <TextStampPrompt
          className="absolute z-30"
          point={pendingTextPoint}
          onSubmit={addTextShape}
          onCancel={cancelPendingText}
        />
      ) : null}
    </>
  )
}

function TextStampPrompt({
  point,
  onSubmit,
  onCancel,
  className,
}: {
  point: { x: number; y: number }
  onSubmit: (text: string) => void
  onCancel: () => void
  className?: string
}) {
  const left = `${point.x * 100}%`
  const top = `${point.y * 100}%`

  return (
    <form
      className={cn(
        "w-44 -translate-x-1/2 rounded-md border border-border bg-card/95 p-2 shadow-lg backdrop-blur-sm",
        className,
      )}
      style={{ left, top }}
      onSubmit={(event) => {
        event.preventDefault()
        const form = event.currentTarget
        const input = form.elements.namedItem("text") as HTMLInputElement
        onSubmit(input.value)
      }}
    >
      <Input
        name="text"
        autoFocus
        placeholder="Label…"
        aria-label="Annotation text"
        className="h-8 text-sm"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault()
            onCancel()
          }
        }}
      />
    </form>
  )
}
