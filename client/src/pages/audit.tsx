import { useEffect, useMemo, useState } from "react"
import {
  AUDIT_EVENT_LABELS,
  AUDIT_EVENT_TYPE_VALUES,
  type AuditEventSummary,
  type AuditEventType,
} from "@playblast/shared"
import { Download, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PageError } from "@/components/feedback/page-error"
import { PageLoading } from "@/components/feedback/page-loading"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useSession } from "@/hooks/use-session"
import {
  downloadAuditEventsExport,
  fetchAuditEvents,
  getForbiddenMessage,
  isApiError,
} from "@/lib/api-http"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 50

const EVENT_FILTER_OPTIONS = [
  { value: "all", label: "All events" },
  ...AUDIT_EVENT_TYPE_VALUES.map((eventType) => ({
    value: eventType,
    label: AUDIT_EVENT_LABELS[eventType],
  })),
]

function formatTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

function formatMetadata(metadata: Record<string, unknown> | null): string {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "—"
  }

  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(" · ")
}

function eventBadgeVariant(eventType: string): "default" | "secondary" | "destructive" | "outline" {
  if (eventType.includes("failed") || eventType.includes("disabled") || eventType.includes("revoked")) {
    return "destructive"
  }

  if (eventType.includes("rate_limited") || eventType.includes("delivery_failed")) {
    return "outline"
  }

  return "secondary"
}

function AuditEventRow({ event }: { event: AuditEventSummary }) {
  const actor =
    event.actorName && event.actorEmail
      ? `${event.actorName} (${event.actorEmail})`
      : event.actorEmail ?? event.actorName ?? "System"

  return (
    <TableRow>
      <TableCell className="whitespace-nowrap align-top text-sm">
        {formatTimestamp(event.createdAt)}
      </TableCell>
      <TableCell className="align-top">
        <Badge variant={eventBadgeVariant(event.eventType)}>{event.eventLabel}</Badge>
      </TableCell>
      <TableCell className="align-top text-sm">{actor}</TableCell>
      <TableCell className="max-w-md align-top text-sm text-muted-foreground">
        {formatMetadata(event.metadata)}
      </TableCell>
    </TableRow>
  )
}

export function AuditPage() {
  const { role } = useSession()
  const isAdmin = role === "admin"

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [events, setEvents] = useState<AuditEventSummary[]>([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [eventTypeFilter, setEventTypeFilter] = useState<"all" | AuditEventType>("all")

  const hasMore = events.length < total
  const filterLabel = useMemo(() => {
    if (eventTypeFilter === "all") {
      return "all security and administration events"
    }

    return AUDIT_EVENT_LABELS[eventTypeFilter].toLowerCase()
  }, [eventTypeFilter])

  async function loadEvents(nextOffset: number, append: boolean) {
    if (!isAdmin) {
      setLoading(false)
      return
    }

    if (append) {
      setRefreshing(true)
    } else {
      setLoading(true)
    }
    setError(null)

    try {
      const response = await fetchAuditEvents({
        limit: PAGE_SIZE,
        offset: nextOffset,
        eventType: eventTypeFilter === "all" ? undefined : eventTypeFilter,
      })

      setTotal(response.total)
      setOffset(nextOffset)
      setEvents((current) =>
        append ? [...current, ...response.events] : response.events,
      )
    } catch (loadError) {
      const forbidden = getForbiddenMessage(loadError)
      if (forbidden) {
        setError(forbidden)
      } else if (isApiError(loadError)) {
        setError(loadError.message)
      } else {
        setError("Could not load audit events.")
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!isAdmin) {
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetchAuditEvents({
          limit: PAGE_SIZE,
          offset: 0,
          eventType: eventTypeFilter === "all" ? undefined : eventTypeFilter,
        })

        if (cancelled) {
          return
        }

        setTotal(response.total)
        setOffset(0)
        setEvents(response.events)
      } catch (loadError) {
        if (cancelled) {
          return
        }

        const forbidden = getForbiddenMessage(loadError)
        if (forbidden) {
          setError(forbidden)
        } else if (isApiError(loadError)) {
          setError(loadError.message)
        } else {
          setError("Could not load audit events.")
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
  }, [eventTypeFilter, isAdmin])

  async function handleExport() {
    setExporting(true)
    setError(null)

    try {
      await downloadAuditEventsExport(
        eventTypeFilter === "all" ? undefined : eventTypeFilter,
      )
    } catch (exportError) {
      if (isApiError(exportError)) {
        setError(exportError.message)
      } else {
        setError("Could not export audit events.")
      }
    } finally {
      setExporting(false)
    }
  }

  if (!isAdmin) {
    return (
      <PageError
        title="Access denied"
        message="Only administrators can view the audit log."
      />
    )
  }

  if (loading) {
    return (
      <PageLoading label="Loading audit events..." className="space-y-6">
        <div className="text-muted-foreground text-sm">Loading audit events...</div>
      </PageLoading>
    )
  }

  if (error && events.length === 0) {
    return (
      <PageError
        title="Audit log unavailable"
        message={error}
        onRetry={() => void loadEvents(0, false)}
      />
    )
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="type-page-title">Audit log</h1>
        <p className="text-muted-foreground">
          Review durable security and administration events for this studio,
          including authentication, invitations, role changes, and SMTP actions.
        </p>
      </div>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <CardTitle>Events</CardTitle>
            <CardDescription>
              Showing {events.length} of {total} events for {filterLabel}.
            </CardDescription>
          </div>
          <div className="flex flex-col gap-3 sm:items-end">
            <div className="space-y-2">
              <Label htmlFor="audit-event-filter">Event type</Label>
              <Select
                value={eventTypeFilter}
                onValueChange={(value) =>
                  setEventTypeFilter(value as "all" | AuditEventType)
                }
              >
                <SelectTrigger id="audit-event-filter" className="w-[min(100%,20rem)]">
                  <SelectValue placeholder="Filter events" />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadEvents(0, false)}
                disabled={refreshing}
              >
                <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
                Refresh
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleExport()}
                disabled={exporting || total === 0}
              >
                <Download className="size-4" />
                {exporting ? "Exporting..." : "Export CSV"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <p className="text-destructive text-sm" role="alert">{error}</p>
          ) : null}

          {events.length === 0 ? (
            <p className="text-muted-foreground text-sm">No audit events recorded yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Actor</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((event) => (
                    <AuditEventRow key={event.id} event={event} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {hasMore ? (
            <div className="flex justify-center">
              <Button
                type="button"
                variant="outline"
                onClick={() => void loadEvents(offset + PAGE_SIZE, true)}
                disabled={refreshing}
              >
                {refreshing ? "Loading..." : "Load more"}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}

export default AuditPage
