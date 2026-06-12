import type { AnnotationShape, FrameAnnotation } from "../types/annotation.js"

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isNormalizedCoord(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1
}

function parseShapeBase(value: unknown): {
  id: string
  color: string
  strokeWidth: number
} | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  const id = typeof record.id === "string" ? record.id.trim() : ""
  const color = typeof record.color === "string" ? record.color.trim() : ""
  const strokeWidth = record.strokeWidth

  if (!id || !color || !isFiniteNumber(strokeWidth) || strokeWidth <= 0) {
    return null
  }

  return { id, color, strokeWidth }
}

function parseAnnotationShape(value: unknown): AnnotationShape | null {
  if (!value || typeof value !== "object") {
    return null
  }

  const record = value as Record<string, unknown>
  const type = record.type
  const base = parseShapeBase(value)

  if (!base) {
    return null
  }

  if (type === "freehand") {
    if (!Array.isArray(record.points) || record.points.length < 4) {
      return null
    }

    if (!record.points.every(isNormalizedCoord)) {
      return null
    }

    if (record.points.length % 2 !== 0) {
      return null
    }

    return {
      ...base,
      type: "freehand",
      points: record.points,
    }
  }

  if (type === "arrow") {
    if (!Array.isArray(record.points) || record.points.length !== 4) {
      return null
    }

    if (!record.points.every(isNormalizedCoord)) {
      return null
    }

    return {
      ...base,
      type: "arrow",
      points: record.points as [number, number, number, number],
    }
  }

  if (type === "text") {
    if (!Array.isArray(record.points) || record.points.length !== 2) {
      return null
    }

    if (!record.points.every(isNormalizedCoord)) {
      return null
    }

    const text = typeof record.text === "string" ? record.text.trim() : ""
    const fontSize = record.fontSize

    if (!text || !isFiniteNumber(fontSize) || fontSize <= 0) {
      return null
    }

    return {
      ...base,
      type: "text",
      points: record.points as [number, number],
      text,
      fontSize,
    }
  }

  return null
}

export function parseFrameAnnotation(value: unknown): FrameAnnotation | { error: string } {
  if (value === undefined || value === null) {
    return { error: "Annotation payload is required." }
  }

  if (typeof value !== "object") {
    return { error: "Annotation must be an object." }
  }

  const record = value as Record<string, unknown>
  const timestamp = record.timestamp
  const viewportWidth = record.viewportWidth
  const viewportHeight = record.viewportHeight

  if (!isFiniteNumber(timestamp) || timestamp < 0) {
    return { error: "Annotation timestamp must be a non-negative number." }
  }

  if (!isFiniteNumber(viewportWidth) || viewportWidth <= 0) {
    return { error: "Annotation viewportWidth must be a positive number." }
  }

  if (!isFiniteNumber(viewportHeight) || viewportHeight <= 0) {
    return { error: "Annotation viewportHeight must be a positive number." }
  }

  if (!Array.isArray(record.shapes)) {
    return { error: "Annotation shapes must be an array." }
  }

  if (record.shapes.length === 0) {
    return { error: "Annotation must include at least one shape." }
  }

  const shapes: AnnotationShape[] = []

  for (const shape of record.shapes) {
    const parsed = parseAnnotationShape(shape)
    if (!parsed) {
      return { error: "Annotation contains an invalid shape." }
    }

    shapes.push(parsed)
  }

  return {
    timestamp,
    shapes,
    viewportWidth,
    viewportHeight,
  }
}
