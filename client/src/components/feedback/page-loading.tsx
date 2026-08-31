import { cn } from "@/lib/utils"

interface PageLoadingProps {
  children: React.ReactNode
  label?: string
  className?: string
}

export function PageLoading({
  children,
  label = "Loading…",
  className,
}: PageLoadingProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className={cn(className)}
    >
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}
