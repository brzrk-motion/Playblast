import { useCallback, useEffect, useState } from "react"
import {
  clearTaskTimer,
  elapsedHoursSince,
  readTaskTimer,
  writeTaskTimer,
  type TaskTimerState,
} from "@/lib/time-log"

export function useTaskTimer(taskId: string) {
  const [timer, setTimer] = useState<TaskTimerState | null>(() => readTaskTimer(taskId))
  const [elapsedMs, setElapsedMs] = useState(0)

  useEffect(() => {
    if (!timer) {
      return
    }

    const intervalId = window.setInterval(() => {
      setElapsedMs(
        Math.max(0, Date.now() - new Date(timer.startedAt).getTime()),
      )
    }, 1000)

    return () => window.clearInterval(intervalId)
  }, [timer])

  const start = useCallback(() => {
    const next: TaskTimerState = { startedAt: new Date().toISOString() }
    writeTaskTimer(taskId, next)
    setTimer(next)
    setElapsedMs(0)
  }, [taskId])

  const stop = useCallback(() => {
    const active = readTaskTimer(taskId)
    if (!active) return null

    const durationHours = elapsedHoursSince(active.startedAt)
    clearTaskTimer(taskId)
    setTimer(null)
    setElapsedMs(0)
    return durationHours > 0 ? durationHours : null
  }, [taskId])

  return {
    isRunning: timer !== null,
    startedAt: timer?.startedAt,
    elapsedMs,
    start,
    stop,
  }
}
