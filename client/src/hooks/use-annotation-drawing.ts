import { useCallback, useRef, useState } from "react"

import { createShapeId, normalizePointer } from "@/lib/annotation"
import type {
  AnnotationShape,
  AnnotationTool,
  ArrowShape,
  FreehandShape,
  TextShape,
} from "@/types/annotation"

const DEFAULT_COLOR = "#f97316"
const DEFAULT_STROKE_WIDTH = 0.004
const DEFAULT_FONT_SIZE = 0.04

interface UseAnnotationDrawingOptions {
  enabled: boolean
  tool: AnnotationTool
  color?: string
  strokeWidth?: number
}

export function useAnnotationDrawing({
  enabled,
  tool,
  color = DEFAULT_COLOR,
  strokeWidth = DEFAULT_STROKE_WIDTH,
}: UseAnnotationDrawingOptions) {
  const overlayRef = useRef<SVGSVGElement>(null)
  const [shapes, setShapes] = useState<AnnotationShape[]>([])
  const [draftShape, setDraftShape] = useState<AnnotationShape | null>(null)
  const [pendingTextPoint, setPendingTextPoint] = useState<{
    x: number
    y: number
  } | null>(null)

  const getOverlayRect = useCallback(() => {
    return overlayRef.current?.getBoundingClientRect() ?? null
  }, [])

  const clearShapes = useCallback(() => {
    setShapes([])
    setDraftShape(null)
    setPendingTextPoint(null)
  }, [])

  const undoLastShape = useCallback(() => {
    setShapes((current) => current.slice(0, -1))
    setDraftShape(null)
    setPendingTextPoint(null)
  }, [])

  const addTextShape = useCallback(
    (text: string) => {
      if (!pendingTextPoint || !text.trim()) {
        setPendingTextPoint(null)
        return
      }

      const shape: TextShape = {
        id: createShapeId(),
        type: "text",
        color,
        strokeWidth,
        points: [pendingTextPoint.x, pendingTextPoint.y],
        text: text.trim(),
        fontSize: DEFAULT_FONT_SIZE,
      }

      setShapes((current) => [...current, shape])
      setPendingTextPoint(null)
    },
    [color, pendingTextPoint, strokeWidth],
  )

  const cancelPendingText = useCallback(() => {
    setPendingTextPoint(null)
  }, [])

  const handlePointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!enabled) {
        return
      }

      const rect = getOverlayRect()
      if (!rect) {
        return
      }

      event.preventDefault()
      event.currentTarget.setPointerCapture(event.pointerId)

      const point = normalizePointer(event.clientX, event.clientY, rect)

      if (tool === "text") {
        setPendingTextPoint(point)
        return
      }

      if (tool === "freehand") {
        const shape: FreehandShape = {
          id: createShapeId(),
          type: "freehand",
          color,
          strokeWidth,
          points: [point.x, point.y],
        }
        setDraftShape(shape)
        return
      }

      if (tool === "arrow") {
        const shape: ArrowShape = {
          id: createShapeId(),
          type: "arrow",
          color,
          strokeWidth,
          points: [point.x, point.y, point.x, point.y],
        }
        setDraftShape(shape)
      }
    },
    [color, enabled, getOverlayRect, strokeWidth, tool],
  )

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!enabled || !draftShape) {
        return
      }

      const rect = getOverlayRect()
      if (!rect) {
        return
      }

      const point = normalizePointer(event.clientX, event.clientY, rect)

      if (draftShape.type === "freehand") {
        setDraftShape({
          ...draftShape,
          points: [...draftShape.points, point.x, point.y],
        })
        return
      }

      if (draftShape.type === "arrow") {
        setDraftShape({
          ...draftShape,
          points: [draftShape.points[0], draftShape.points[1], point.x, point.y],
        })
      }
    },
    [draftShape, enabled, getOverlayRect],
  )

  const handlePointerUp = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (!enabled || !draftShape) {
        return
      }

      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }

      if (draftShape.type === "freehand") {
        if (draftShape.points.length >= 4) {
          setShapes((current) => [...current, draftShape])
        }
      } else if (draftShape.type === "arrow") {
        const [x1, y1, x2, y2] = draftShape.points
        const distance = Math.hypot(x2 - x1, y2 - y1)
        if (distance > 0.01) {
          setShapes((current) => [...current, draftShape])
        }
      }

      setDraftShape(null)
    },
    [draftShape, enabled],
  )

  return {
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
  }
}
