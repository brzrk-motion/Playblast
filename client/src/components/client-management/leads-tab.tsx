import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Check,
  Minus,
  MoreHorizontal,
  Plus,
  Search,
  UserPlus,
} from "lucide-react"
import {
  AddLeadModal,
  type LeadFormValues,
} from "@/components/client-management/add-lead-modal"
import { LeadDetailDialog } from "@/components/client-management/lead-detail-dialog"
import { LeadStatusBadge } from "@/components/client-management/lead-status-badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  convertLeadToClient,
  createLead,
  deleteLead,
  listLeads,
  updateLead,
} from "@/lib/api"
import { formatRelativeDate } from "@/lib/dates"
import {
  filterLeadsBySearch,
  LEAD_STATUS_LABELS,
} from "@/lib/leads"
import { humanizeApiError, showErrorToast, showSuccessToast } from "@/lib/toast"
import type { Lead, LeadStatus } from "@/types/lead"
import { LEAD_STATUSES } from "@/types/lead"

type RepliedFilter = "all" | "yes" | "no"

function leadFormToPayload(values: LeadFormValues) {
  return {
    name: values.name.trim(),
    email: values.email.trim(),
    company: values.company.trim() || undefined,
    phone: values.phone.trim() || undefined,
    source: values.source.trim() || undefined,
    status: values.status,
    notes: values.notes.trim() || undefined,
  }
}

export function LeadsTab() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all")
  const [repliedFilter, setRepliedFilter] = useState<RepliedFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [modalOpen, setModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<"create" | "edit">("create")
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [viewLead, setViewLead] = useState<Lead | null>(null)

  const fetchLeads = useCallback(
    async (options?: { showLoading?: boolean }) => {
      if (options?.showLoading) {
        setLoading(true)
      }

      try {
        const filters: { status?: LeadStatus; replied?: boolean } = {}
        if (statusFilter !== "all") {
          filters.status = statusFilter
        }
        if (repliedFilter === "yes") {
          filters.replied = true
        } else if (repliedFilter === "no") {
          filters.replied = false
        }

        const data = await listLeads(filters)
        setLeads(data)
        setError(null)
      } catch (err) {
        const message = humanizeApiError(err, "Failed to load leads")
        setError(message)
        showErrorToast(message)
      } finally {
        setLoading(false)
      }
    },
    [repliedFilter, statusFilter],
  )

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const filters: { status?: LeadStatus; replied?: boolean } = {}
        if (statusFilter !== "all") {
          filters.status = statusFilter
        }
        if (repliedFilter === "yes") {
          filters.replied = true
        } else if (repliedFilter === "no") {
          filters.replied = false
        }

        const data = await listLeads(filters)
        if (!cancelled) {
          setLeads(data)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          const message = humanizeApiError(err, "Failed to load leads")
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
  }, [repliedFilter, statusFilter])

  const filteredLeads = useMemo(
    () => filterLeadsBySearch(leads, searchQuery),
    [leads, searchQuery],
  )

  function openCreateModal() {
    setModalMode("create")
    setSelectedLead(null)
    setFormError(null)
    setModalOpen(true)
  }

  function openEditModal(lead: Lead) {
    setModalMode("edit")
    setSelectedLead(lead)
    setFormError(null)
    setModalOpen(true)
  }

  async function handleSubmit(values: LeadFormValues) {
    setSubmitting(true)
    setFormError(null)

    try {
      if (modalMode === "create") {
        await createLead(leadFormToPayload(values))
        showSuccessToast("Lead added")
      } else if (selectedLead) {
        await updateLead(selectedLead.id, leadFormToPayload(values))
        showSuccessToast("Lead updated")
      }
      setModalOpen(false)
      await fetchLeads()
    } catch (err) {
      const message = humanizeApiError(err, "Failed to save lead")
      setFormError(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleConvert(lead: Lead) {
    if (
      !window.confirm(
        `Convert "${lead.name}" to a client? This will mark the lead as converted.`,
      )
    ) {
      return
    }

    try {
      await convertLeadToClient(lead.id)
      showSuccessToast("Lead converted to client")
      await fetchLeads()
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to convert lead"))
    }
  }

  async function handleDelete(lead: Lead) {
    if (!window.confirm(`Delete lead "${lead.name}"? This cannot be undone.`)) {
      return
    }

    try {
      await deleteLead(lead.id)
      showSuccessToast("Lead deleted")
      await fetchLeads()
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to delete lead"))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[12rem] flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search name or company"
              className="pl-9"
              aria-label="Search leads"
            />
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as LeadStatus | "all")
            }
          >
            <SelectTrigger className="w-full sm:w-[10rem]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {LEAD_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {LEAD_STATUS_LABELS[status]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <ToggleGroup
            type="single"
            value={repliedFilter}
            onValueChange={(value) => {
              if (value) {
                setRepliedFilter(value as RepliedFilter)
              }
            }}
            variant="outline"
            size="sm"
          >
            <ToggleGroupItem value="all" aria-label="All leads">
              All
            </ToggleGroupItem>
            <ToggleGroupItem value="yes" aria-label="Replied yes">
              Replied
            </ToggleGroupItem>
            <ToggleGroupItem value="no" aria-label="Replied no">
              No reply
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <Button onClick={openCreateModal}>
          <Plus className="size-4" />
          Add Lead
        </Button>
      </div>

      <Card>
        <CardHeader className="sr-only">
          <CardTitle>Leads</CardTitle>
          <CardDescription>Sales pipeline contacts</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 border-destructive/30 bg-destructive/5 p-8 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button variant="outline" size="sm" onClick={() => void fetchLeads({ showLoading: true })}>
                Retry
              </Button>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <UserPlus className="size-8 text-muted-foreground" />
              <div>
                <p className="font-medium">No leads found</p>
                <p className="text-sm text-muted-foreground">
                  Adjust filters or add your first lead.
                </p>
              </div>
              <Button size="sm" onClick={openCreateModal}>
                <Plus className="size-4" />
                Add Lead
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Contacted</TableHead>
                  <TableHead>Replied</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead className="w-[4rem] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">{lead.name}</TableCell>
                    <TableCell>{lead.company ?? "—"}</TableCell>
                    <TableCell>
                      <LeadStatusBadge status={lead.status} />
                    </TableCell>
                    <TableCell>
                      {formatRelativeDate(lead.lastContactedAt)}
                    </TableCell>
                    <TableCell>
                      {lead.replied ? (
                        <Check
                          className="size-4 text-status-success-foreground"
                          aria-label="Replied"
                        />
                      ) : (
                        <Minus
                          className="size-4 text-muted-foreground"
                          aria-label="No reply"
                        />
                      )}
                    </TableCell>
                    <TableCell>{lead.source ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Actions for ${lead.name}`}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewLead(lead)}>
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openEditModal(lead)}>
                            Edit
                          </DropdownMenuItem>
                          {lead.status !== "converted" ? (
                            <DropdownMenuItem
                              onClick={() => void handleConvert(lead)}
                            >
                              Convert to Client
                            </DropdownMenuItem>
                          ) : null}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => void handleDelete(lead)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddLeadModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={modalMode}
        lead={selectedLead}
        submitting={submitting}
        error={formError}
        onSubmit={(values) => void handleSubmit(values)}
      />

      <LeadDetailDialog
        open={viewLead !== null}
        onOpenChange={(open) => {
          if (!open) {
            setViewLead(null)
          }
        }}
        lead={viewLead}
      />
    </div>
  )
}
