import { useRef, useState } from "react"
import type { Client } from "@/types/client"
import {
  clientToFormValues,
  isClientFormDirty,
  type ClientFormValues,
} from "@/lib/client-form"

const UNSAVED_CHANGES_MESSAGE =
  "You have unsaved changes. Discard them and close?"

export function useClientForm(client?: Client | null) {
  const [values, setValues] = useState<ClientFormValues>(() =>
    clientToFormValues(client),
  )
  const [wasOpen, setWasOpen] = useState(false)
  const initialValuesRef = useRef<ClientFormValues>(clientToFormValues(client))

  function resetForOpen(nextClient?: Client | null) {
    const nextValues = clientToFormValues(nextClient)
    initialValuesRef.current = nextValues
    setValues(nextValues)
  }

  function syncOpenState(open: boolean, nextClient?: Client | null) {
    if (open !== wasOpen) {
      setWasOpen(open)
      if (open) {
        resetForOpen(nextClient)
      }
    }
  }

  function update<K extends keyof ClientFormValues>(
    key: K,
    value: ClientFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function isDirty() {
    return isClientFormDirty(values, initialValuesRef.current)
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

  return {
    values,
    update,
    syncOpenState,
    handleOpenChange,
    isDirty,
  }
}
