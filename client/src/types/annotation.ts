export type AnnotationTool = "freehand" | "arrow" | "text"

export interface AnnotationShapeBase {
  id: string
  color: string
  strokeWidth: number
}

export interface FreehandShape extends AnnotationShapeBase {
  type: "freehand"
  /** Normalized [x,y] pairs in 0–1 space relative to the video viewport */
  points: number[]
}

export interface ArrowShape extends AnnotationShapeBase {
  type: "arrow"
  /** Normalized start x, start y, end x, end y */
  points: [number, number, number, number]
}

export interface TextShape extends AnnotationShapeBase {
  type: "text"
  /** Normalized x, y anchor */
  points: [number, number]
  text: string
  fontSize: number
}

export type AnnotationShape = FreehandShape | ArrowShape | TextShape

/** Frame-level annotation payload stored as JSON on a comment */
export interface FrameAnnotation {
  timestamp: number
  shapes: AnnotationShape[]
  /** Reference viewport width at draw time (for aspect-ratio context) */
  viewportWidth: number
  /** Reference viewport height at draw time */
  viewportHeight: number
}
