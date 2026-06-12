export type AnnotationTool = "freehand" | "arrow" | "text"

export interface AnnotationShapeBase {
  id: string
  color: string
  strokeWidth: number
}

export interface FreehandShape extends AnnotationShapeBase {
  type: "freehand"
  points: number[]
}

export interface ArrowShape extends AnnotationShapeBase {
  type: "arrow"
  points: [number, number, number, number]
}

export interface TextShape extends AnnotationShapeBase {
  type: "text"
  points: [number, number]
  text: string
  fontSize: number
}

export type AnnotationShape = FreehandShape | ArrowShape | TextShape

export interface FrameAnnotation {
  timestamp: number
  shapes: AnnotationShape[]
  viewportWidth: number
  viewportHeight: number
}
