import { useEffect, useRef, useState } from "react"

/**
 * Fires once when the observed element enters the viewport.
 * Used to defer heavy renders (e.g. Recharts) until the user can see them.
 */
export function useInView(rootMargin = "120px") {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element || inView) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin },
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [inView, rootMargin])

  return { ref, inView }
}
