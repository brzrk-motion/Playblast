import type { AnnotationShape, FrameAnnotation } from "@/types/annotation"
import { randomUUID } from "@/lib/uuid"

/** Seconds within which an annotation is shown at the current playhead */
export const ANNOTATION_TIMESTAMP_THRESHOLD = 0.5

export function isNearTimestamp(
  currentTime: number,
  annotationTime: number,
  threshold = ANNOTATION_TIMESTAMP_THRESHOLD,
): boolean {
  return Math.abs(currentTime - annotationTime) <= threshold
}

export function createShapeId(): string {
  return `shape-${randomUUID()}`
}

export function pointsToSvgPath(points: number[]): string {
  if (points.length < 2) {
    return ""
  }

  const [startX, startY, ...rest] = points
  let path = `M ${startX} ${startY}`

  for (let index = 0; index < rest.length; index += 2) {
    path += ` L ${rest[index]} ${rest[index + 1]}`
  }

  return path
}

export function normalizePointer(
  clientX: number,
  clientY: number,
  rect: DOMRect,
): { x: number; y: number } {
  return {
    x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
  }
}

export function getVisibleAnnotations(
  comments: Array<{ timestamp: number; annotation?: FrameAnnotation }>,
  currentTime: number,
): FrameAnnotation[] {
  return comments
    .filter(
      (comment) =>
        comment.annotation &&
        isNearTimestamp(currentTime, comment.annotation.timestamp),
    )
    .map((comment) => comment.annotation!)
}

export function mergeAnnotationShapes(
  annotations: FrameAnnotation[],
): AnnotationShape[] {
  return annotations.flatMap((annotation) => annotation.shapes)
}
