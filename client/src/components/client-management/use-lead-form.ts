import { useRef, useState } from "react"
import type { Lead } from "@/types/lead"
import {
  isLeadFormDirty,
  leadToFormValues,
  type LeadFormValues,
} from "@/lib/lead-form"

const UNSAVED_CHANGES_MESSAGE =
  "You have unsaved changes. Discard them and close?"

export function useLeadForm(lead?: Lead | null) {
  const [values, setValues] = useState<LeadFormValues>(() => leadToFormValues(lead))
  const [wasOpen, setWasOpen] = useState(false)
  const initialValuesRef = useRef<LeadFormValues>(leadToFormValues(lead))

  function resetForOpen(nextLead?: Lead | null) {
    const nextValues = leadToFormValues(nextLead)
    initialValuesRef.current = nextValues
    setValues(nextValues)
  }

  function syncOpenState(open: boolean, nextLead?: Lead | null) {
    if (open !== wasOpen) {
      setWasOpen(open)
      if (open) {
        resetForOpen(nextLead)
      }
    }
  }

  function update<K extends keyof LeadFormValues>(
    key: K,
    value: LeadFormValues[K],
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function isDirty() {
    return isLeadFormDirty(values, initialValuesRef.current)
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
