import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Pencil, Trash2, UserPlus } from "lucide-react"
import { LeadStatusBadge } from "@/components/client-management/lead-status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import {
  convertLeadToClient,
  createContactLog,
  deleteContactLog,
  deleteLead,
  getLead,
} from "@/lib/api"
import {
  CONTACT_LOG_TYPE_ICONS,
  CONTACT_LOG_TYPE_LABELS,
  dateInputToIso,
  sortContactLogChronological,
  toDateInputValue,
} from "@/lib/contact-log"
import { formatDateTime, formatRelativeDate } from "@/lib/dates"
import { humanizeApiError, showErrorToast, showSuccessToast } from "@/lib/toast"
import {
  CONTACT_LOG_TYPES,
  type ContactLog,
  type ContactLogType,
} from "@/types/contact-log"
import type { Lead, LeadWithContactLog } from "@/types/lead"

interface LeadDetailSheetProps {
  leadId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onLeadUpdated?: (lead: Lead) => void
  onLeadDeleted?: () => void
  onEdit?: (lead: Lead) => void
}

function DetailRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid gap-1 sm:grid-cols-[7.5rem_1fr]">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm">{children}</dd>
    </div>
  )
}

export function LeadDetailSheet({
  leadId,
  open,
  onOpenChange,
  onLeadUpdated,
  onLeadDeleted,
  onEdit,
}: LeadDetailSheetProps) {
  const navigate = useNavigate()
  const [lead, setLead] = useState<LeadWithContactLog | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [converting, setConverting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [logType, setLogType] = useState<ContactLogType>("email")
  const [logDate, setLogDate] = useState(toDateInputValue())
  const [logNotes, setLogNotes] = useState("")
  const [loggingContact, setLoggingContact] = useState(false)
  const [deletingLogId, setDeletingLogId] = useState<string | null>(null)

  async function refreshLead() {
    if (!leadId) {
      return null
    }

    setLoading(true)
    setError(null)

    try {
      const data = await getLead(leadId)
      setLead(data)
      return data
    } catch (err) {
      const message = humanizeApiError(err, "Failed to load lead")
      setError(message)
      showErrorToast(message)
      return null
    } finally {
      setLoading(false)
    }
  }

  function resetFormState() {
    setLead(null)
    setError(null)
    setLogType("email")
    setLogDate(toDateInputValue())
    setLogNotes("")
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      resetFormState()
    }
    onOpenChange(nextOpen)
  }

  useEffect(() => {
    if (!open || !leadId) {
      return
    }

    let cancelled = false

    async function load() {
      const currentLeadId = leadId
      if (!currentLeadId) {
        return
      }

      setLoading(true)
      setError(null)

      try {
        const data = await getLead(currentLeadId)
        if (!cancelled) {
          setLead(data)
        }
      } catch (err) {
        if (!cancelled) {
          const message = humanizeApiError(err, "Failed to load lead")
          setError(message)
          showErrorToast(message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [leadId, open])

  async function handleConvert() {
    if (!lead || lead.status === "converted") {
      return
    }

    if (
      !window.confirm(
        `Convert "${lead.name}" to a client? This will mark the lead as converted.`,
      )
    ) {
      return
    }

    setConverting(true)

    try {
      const client = await convertLeadToClient(lead.id)
      showSuccessToast("Lead converted to client")
      onOpenChange(false)
      navigate(`/clients?tab=clients&client=${encodeURIComponent(client.id)}`)
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to convert lead"))
    } finally {
      setConverting(false)
    }
  }

  async function handleDelete() {
    if (!lead) {
      return
    }

    if (
      !window.confirm(`Delete lead "${lead.name}"? This cannot be undone.`)
    ) {
      return
    }

    setDeleting(true)

    try {
      await deleteLead(lead.id)
      showSuccessToast("Lead deleted")
      onOpenChange(false)
      onLeadDeleted?.()
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to delete lead"))
    } finally {
      setDeleting(false)
    }
  }

  async function handleLogContact(event: React.FormEvent) {
    event.preventDefault()

    if (!lead) {
      return
    }

    setLoggingContact(true)

    try {
      await createContactLog(lead.id, {
        type: logType,
        contactedAt: dateInputToIso(logDate),
        notes: logNotes.trim() || undefined,
      })
      showSuccessToast("Contact logged")
      setLogNotes("")
      setLogDate(toDateInputValue())
      const refreshed = await refreshLead()
      if (refreshed) {
        onLeadUpdated?.(refreshed)
      }
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to log contact"))
    } finally {
      setLoggingContact(false)
    }
  }

  async function handleDeleteLog(entry: ContactLog) {
    if (!lead) {
      return
    }

    if (!window.confirm("Delete this contact log entry?")) {
      return
    }

    setDeletingLogId(entry.id)

    try {
      await deleteContactLog(lead.id, entry.id)
      showSuccessToast("Contact log entry deleted")
      const refreshed = await refreshLead()
      if (refreshed) {
        onLeadUpdated?.(refreshed)
      }
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to delete contact log entry"))
    } finally {
      setDeletingLogId(null)
    }
  }

  const sortedLog = lead
    ? sortContactLogChronological(lead.contactLog)
    : []

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto p-0 sm:max-w-xl"
      >
        {loading && !lead ? (
          <div className="space-y-4 p-6">
            <Skeleton className="h-8 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : error && !lead ? (
          <div className="flex flex-col gap-3 p-6">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" onClick={() => void refreshLead()}>
              Retry
            </Button>
          </div>
        ) : lead ? (
          <div className="flex min-h-full flex-col">
            <SheetHeader className="border-b px-6 pt-6 pb-4">
              <div className="flex flex-col gap-3 pr-8">
                <div className="space-y-1">
                  <SheetTitle className="text-2xl">{lead.name}</SheetTitle>
                  <SheetDescription className="text-base">
                    {lead.company ?? "No company"}
                  </SheetDescription>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <LeadStatusBadge status={lead.status} />
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit?.(lead)}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={lead.status === "converted" || converting}
                    onClick={() => void handleConvert()}
                  >
                    {converting ? (
                      <Spinner className="size-4" />
                    ) : (
                      <UserPlus className="size-4" />
                    )}
                    Convert to Client
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    disabled={deleting}
                    onClick={() => void handleDelete()}
                  >
                    {deleting ? (
                      <Spinner className="size-4" />
                    ) : (
                      <Trash2 className="size-4" />
                    )}
                    Delete
                  </Button>
                </div>
              </div>
            </SheetHeader>

            <div className="flex-1 space-y-6 px-6 py-5">
              <section className="space-y-3">
                <h3 className="text-sm font-medium">Contact Information</h3>
                <dl className="space-y-3">
                  <DetailRow label="Email">
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {lead.email}
                    </a>
                  </DetailRow>
                  <DetailRow label="Phone">
                    {lead.phone ? (
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-primary underline-offset-4 hover:underline"
                      >
                        {lead.phone}
                      </a>
                    ) : (
                      "—"
                    )}
                  </DetailRow>
                  <DetailRow label="Source">{lead.source ?? "—"}</DetailRow>
                  <DetailRow label="Notes">{lead.notes ?? "—"}</DetailRow>
                </dl>
              </section>

              <section className="space-y-3">
                <h3 className="text-sm font-medium">Last Contacted / Replied</h3>
                <dl className="space-y-3">
                  <DetailRow label="Last contacted">
                    {formatRelativeDate(lead.lastContactedAt)}
                  </DetailRow>
                  <DetailRow label="Replied">
                    <Badge
                      variant={lead.replied ? "default" : "outline"}
                      className={
                        lead.replied
                          ? "bg-status-success text-status-success-foreground"
                          : undefined
                      }
                    >
                      {lead.replied ? "Yes" : "No"}
                    </Badge>
                  </DetailRow>
                </dl>
              </section>

              <section className="space-y-4">
                <h3 className="text-sm font-medium">Contact Log</h3>

                {sortedLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No contact history yet.
                  </p>
                ) : (
                  <ol className="space-y-3">
                    {sortedLog.map((entry) => (
                      <li
                        key={entry.id}
                        className="flex gap-3 rounded-lg border p-3"
                      >
                        <span
                          className="text-lg leading-none"
                          aria-hidden="true"
                        >
                          {CONTACT_LOG_TYPE_ICONS[entry.type]}
                        </span>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">
                                {CONTACT_LOG_TYPE_LABELS[entry.type]}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(entry.contactedAt)}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Delete contact log entry"
                              disabled={deletingLogId === entry.id}
                              onClick={() => void handleDeleteLog(entry)}
                            >
                              {deletingLogId === entry.id ? (
                                <Spinner className="size-4" />
                              ) : (
                                <Trash2 className="size-4" />
                              )}
                            </Button>
                          </div>
                          {entry.notes ? (
                            <p className="text-sm whitespace-pre-wrap">
                              {entry.notes}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}

                <form
                  onSubmit={(event) => void handleLogContact(event)}
                  className="space-y-3 rounded-lg border bg-muted/20 p-4"
                >
                  <h4 className="text-sm font-medium">Add Contact Log Entry</h4>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="contact-log-type">Type</Label>
                      <Select
                        value={logType}
                        onValueChange={(value) =>
                          setLogType(value as ContactLogType)
                        }
                        disabled={loggingContact}
                      >
                        <SelectTrigger id="contact-log-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CONTACT_LOG_TYPES.map((type) => (
                            <SelectItem key={type} value={type}>
                              {CONTACT_LOG_TYPE_ICONS[type]}{" "}
                              {CONTACT_LOG_TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="contact-log-date">Date</Label>
                      <input
                        id="contact-log-date"
                        type="date"
                        value={logDate}
                        onChange={(event) => setLogDate(event.target.value)}
                        disabled={loggingContact}
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="contact-log-notes">Notes</Label>
                    <Textarea
                      id="contact-log-notes"
                      value={logNotes}
                      onChange={(event) => setLogNotes(event.target.value)}
                      placeholder="What was discussed?"
                      disabled={loggingContact}
                    />
                  </div>

                  <Button type="submit" disabled={loggingContact}>
                    {loggingContact ? (
                      <>
                        <Spinner className="size-4" />
                        Logging…
                      </>
                    ) : (
                      "Log Contact"
                    )}
                  </Button>
                </form>
              </section>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
