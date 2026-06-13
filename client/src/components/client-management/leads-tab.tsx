import { useCallback, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Check,
  Minus,
  MoreHorizontal,
  Plus,
  Search,
  UserPlus,
} from "lucide-react"
import { AddLeadModal } from "@/components/client-management/add-lead-modal"
import { ConfirmConvertModal } from "@/components/client-management/confirm-convert-modal"
import { ConvertToClientMenuItem } from "@/components/client-management/convert-to-client-action"
import { EditLeadModal } from "@/components/client-management/edit-lead-modal"
import { LeadDetailSheet } from "@/components/client-management/lead-detail-sheet"
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
import { leadFormToPayload, type LeadFormValues } from "@/lib/lead-form"
import type { Lead, LeadStatus } from "@/types/lead"
import { LEAD_STATUSES } from "@/types/lead"

type RepliedFilter = "all" | "yes" | "no"

export function LeadsTab() {
  const navigate = useNavigate()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all")
  const [repliedFilter, setRepliedFilter] = useState<RepliedFilter>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [viewLeadId, setViewLeadId] = useState<string | null>(null)
  const [convertLead, setConvertLead] = useState<Lead | null>(null)

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
    setFormError(null)
    setAddModalOpen(true)
  }

  function openEditModal(lead: Lead) {
    setSelectedLead(lead)
    setFormError(null)
    setEditModalOpen(true)
  }

  async function handleCreate(values: LeadFormValues) {
    setSubmitting(true)
    setFormError(null)

    try {
      await createLead(leadFormToPayload(values))
      showSuccessToast("Lead added")
      setAddModalOpen(false)
      await fetchLeads()
    } catch (err) {
      const message = humanizeApiError(err, "Failed to save lead")
      setFormError(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(values: LeadFormValues) {
    if (!selectedLead) {
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      const updated = await updateLead(
        selectedLead.id,
        leadFormToPayload(values),
      )
      showSuccessToast("Lead updated")
      setEditModalOpen(false)
      setSelectedLead(null)
      setLeads((current) =>
        current.map((lead) => (lead.id === updated.id ? updated : lead)),
      )
    } catch (err) {
      const message = humanizeApiError(err, "Failed to save lead")
      setFormError(message)
    } finally {
      setSubmitting(false)
    }
  }

  function openConvertModal(lead: Lead) {
    if (lead.status === "converted") {
      return
    }
    setConvertLead(lead)
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
                  <TableRow
                    key={lead.id}
                    className="cursor-pointer"
                    onClick={() => setViewLeadId(lead.id)}
                  >
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
                            onClick={(event) => event.stopPropagation()}
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setViewLeadId(lead.id)}
                          >
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => openEditModal(lead)}
                          >
                            Edit
                          </DropdownMenuItem>
                          <ConvertToClientMenuItem
                            lead={lead}
                            onConvert={() => openConvertModal(lead)}
                          />
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
        open={addModalOpen}
        onOpenChange={(open) => {
          setAddModalOpen(open)
          if (!open) {
            setFormError(null)
          }
        }}
        submitting={submitting}
        error={formError}
        onSubmit={(values) => void handleCreate(values)}
      />

      <EditLeadModal
        open={editModalOpen}
        onOpenChange={(open) => {
          setEditModalOpen(open)
          if (!open) {
            setSelectedLead(null)
            setFormError(null)
          }
        }}
        lead={selectedLead}
        submitting={submitting}
        error={formError}
        onSubmit={(values) => void handleEdit(values)}
      />

      <ConfirmConvertModal
        lead={convertLead}
        open={convertLead !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConvertLead(null)
          }
        }}
        onSuccess={(client, updatedLead) => {
          setLeads((current) =>
            current.map((lead) =>
              lead.id === updatedLead.id ? updatedLead : lead,
            ),
          )
          setConvertLead(null)
          navigate(
            `/clients?tab=clients&client=${encodeURIComponent(client.id)}`,
          )
        }}
      />

      <LeadDetailSheet
        leadId={viewLeadId}
        open={viewLeadId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setViewLeadId(null)
          }
        }}
        onLeadUpdated={(updated) => {
          setLeads((current) =>
            current.map((lead) => (lead.id === updated.id ? updated : lead)),
          )
        }}
        onLeadDeleted={() => void fetchLeads()}
        onEdit={(lead) => {
          setViewLeadId(null)
          openEditModal(lead)
        }}
      />
    </div>
  )
}
