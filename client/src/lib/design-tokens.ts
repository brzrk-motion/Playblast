/** CSS custom property names for runtime access (e.g. SVG/canvas). */
export const DESIGN_TOKENS = {
  annotationAccent: "--annotation-accent",
  annotationTextStroke: "--annotation-text-stroke",
} as const

/** Read a design token value from the document root. */
export function getDesignToken(name: string): string {
  if (typeof document === "undefined") {
    return ""
  }

  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** Default annotation stroke color from the design system. */
export function getAnnotationAccentColor(): string {
  const value = getDesignToken(DESIGN_TOKENS.annotationAccent)
  return value || "oklch(0.705 0.213 47.604)"
}

/** Halo stroke for annotation text labels. */
export function getAnnotationTextStrokeColor(): string {
  const value = getDesignToken(DESIGN_TOKENS.annotationTextStroke)
  return value || "oklch(0 0 0 / 65%)"
}

/** Comment scrub-bar marker color classes (token-backed, cycles by index). */
export const MARKER_COLOR_CLASSES = [
  "bg-marker-1 ring-marker-1-ring",
  "bg-marker-2 ring-marker-2-ring",
  "bg-marker-3 ring-marker-3-ring",
  "bg-marker-4 ring-marker-4-ring",
  "bg-marker-5 ring-marker-5-ring",
] as const

export function markerColorClass(index: number): string {
  return MARKER_COLOR_CLASSES[index % MARKER_COLOR_CLASSES.length]
}
