import { useRef, useState } from "react"
import type { Service } from "@/types/service"
import {
  isServiceFormDirty,
  serviceToFormValues,
  type ServiceFormValues,
} from "@/lib/service-form"

const UNSAVED_CHANGES_MESSAGE =
  "You have unsaved changes. Discard them and close?"

export function useServiceForm(service?: Service | null) {
  const [values, setValues] = useState<ServiceFormValues>(() =>
    serviceToFormValues(service),
  )
  const [wasOpen, setWasOpen] = useState(false)
  const initialValuesRef = useRef<ServiceFormValues>(
    serviceToFormValues(service),
  )

  function resetForOpen(nextService?: Service | null) {
    const nextValues = serviceToFormValues(nextService)
    initialValuesRef.current = nextValues
    setValues(nextValues)
  }

  function syncOpenState(open: boolean, nextService?: Service | null) {
    if (open !== wasOpen) {
      setWasOpen(open)
      if (open) {
        resetForOpen(nextService)
      }
    }
  }

  function update<K extends keyof ServiceFormValues>(
    key: K,
    value: ServiceFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function isDirty() {
    return isServiceFormDirty(values, initialValuesRef.current)
  }

  function requestClose(onOpenChange: (open: boolean) => void) {
    if (isDirty() && !window.confirm(UNSAVED_CHANGES_MESSAGE)) {
      return
    }
    onOpenChange(false)
  }

  function handleOpenChange(
    nextOpen: boolean,
    onOpenChange: (open: boolean) => void,
  ) {
    if (!nextOpen) {
      requestClose(onOpenChange)
      return
    }
    onOpenChange(true)
  }

  function reset(nextService?: Service | null) {
    resetForOpen(nextService)
  }

  return {
    values,
    update,
    syncOpenState,
    handleOpenChange,
    isDirty,
    reset,
  }
}
