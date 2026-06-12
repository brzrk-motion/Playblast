import { pointsToSvgPath } from "@/lib/annotation"
import type { AnnotationShape } from "@/types/annotation"

const ARROW_MARKER_ID = "annotation-arrowhead"

export function AnnotationMarkerDefs() {
  return (
    <defs>
      <marker
        id={ARROW_MARKER_ID}
        viewBox="0 0 10 10"
        refX="8"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="context-stroke" />
      </marker>
    </defs>
  )
}

export function AnnotationShapeView({ shape }: { shape: AnnotationShape }) {
  if (shape.type === "freehand") {
    const path = pointsToSvgPath(shape.points)
    if (!path) {
      return null
    }

    return (
      <path
        d={path}
        fill="none"
        stroke={shape.color}
        strokeWidth={shape.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    )
  }

  if (shape.type === "arrow") {
    const [x1, y1, x2, y2] = shape.points

    return (
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={shape.color}
        strokeWidth={shape.strokeWidth}
        markerEnd={`url(#${ARROW_MARKER_ID})`}
        vectorEffect="non-scaling-stroke"
      />
    )
  }

  const [x, y] = shape.points

  return (
    <text
      x={x}
      y={y}
      fill={shape.color}
      fontSize={shape.fontSize}
      fontWeight="600"
      dominantBaseline="hanging"
      style={{ userSelect: "none", paintOrder: "stroke fill" }}
      stroke="var(--annotation-text-stroke)"
      strokeWidth={shape.strokeWidth * 0.75}
    >
      {shape.text}
    </text>
  )
}
