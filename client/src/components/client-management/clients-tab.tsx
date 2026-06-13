import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { Building2, MoreHorizontal, Plus } from "lucide-react"
import { AddClientModal } from "@/components/client-management/add-client-modal"
import { EditClientModal } from "@/components/client-management/edit-client-modal"
import { ClientDetailSheet } from "@/components/client-management/client-detail-sheet"
import { Badge } from "@/components/ui/badge"
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
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  createClient,
  deleteClient,
  listClients,
  listProjects,
  updateClient,
} from "@/lib/api"
import { formatDateAdded } from "@/lib/dates"
import {
  clientFormToPayload,
  type ClientFormValues,
} from "@/lib/client-form"
import { humanizeApiError, showErrorToast, showSuccessToast } from "@/lib/toast"
import type { Client } from "@/types/client"

export function ClientsTab() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [clients, setClients] = useState<Client[]>([])
  const [projectCounts, setProjectCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [viewClientId, setViewClientId] = useState<string | null>(null)

  const fetchClients = useCallback(async (options?: { showLoading?: boolean }) => {
    if (options?.showLoading) {
      setLoading(true)
    }

    try {
      const [clientData, projectData] = await Promise.all([
        listClients(),
        listProjects(),
      ])

      const counts: Record<string, number> = {}
      for (const project of projectData) {
        if (project.clientId) {
          counts[project.clientId] = (counts[project.clientId] ?? 0) + 1
        }
      }

      setClients(clientData)
      setProjectCounts(counts)
      setError(null)
    } catch (err) {
      const message = humanizeApiError(err, "Failed to load clients")
      setError(message)
      showErrorToast(message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const [clientData, projectData] = await Promise.all([
          listClients(),
          listProjects(),
        ])

        const counts: Record<string, number> = {}
        for (const project of projectData) {
          if (project.clientId) {
            counts[project.clientId] = (counts[project.clientId] ?? 0) + 1
          }
        }

        if (!cancelled) {
          setClients(clientData)
          setProjectCounts(counts)
          setError(null)
        }
      } catch (err) {
        if (!cancelled) {
          const message = humanizeApiError(err, "Failed to load clients")
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
  }, [])

  const clientIdFromUrl = searchParams.get("client")
  const activeViewClientId = viewClientId ?? clientIdFromUrl

  function openClientDetail(clientId: string) {
    setViewClientId(clientId)
    const next = new URLSearchParams(searchParams)
    next.set("tab", "clients")
    next.set("client", clientId)
    setSearchParams(next, { replace: true })
  }

  function closeClientDetail() {
    setViewClientId(null)
    if (clientIdFromUrl) {
      const next = new URLSearchParams(searchParams)
      next.delete("client")
      setSearchParams(next, { replace: true })
    }
  }

  const sortedClients = useMemo(
    () =>
      [...clients].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() -
          new Date(left.createdAt).getTime(),
      ),
    [clients],
  )

  function openCreateModal() {
    setFormError(null)
    setAddModalOpen(true)
  }

  function openEditModal(client: Client) {
    setSelectedClient(client)
    setFormError(null)
    setEditModalOpen(true)
  }

  async function handleCreate(values: ClientFormValues) {
    setSubmitting(true)
    setFormError(null)

    try {
      await createClient(clientFormToPayload(values))
      showSuccessToast("Client added")
      setAddModalOpen(false)
      await fetchClients()
    } catch (err) {
      const message = humanizeApiError(err, "Failed to save client")
      setFormError(message)
      showErrorToast(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleEdit(values: ClientFormValues) {
    if (!selectedClient) {
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      const updated = await updateClient(
        selectedClient.id,
        clientFormToPayload(values),
      )
      showSuccessToast("Client updated")
      setEditModalOpen(false)
      setSelectedClient(null)
      setClients((current) =>
        current.map((client) => (client.id === updated.id ? updated : client)),
      )
    } catch (err) {
      const message = humanizeApiError(err, "Failed to save client")
      setFormError(message)
      showErrorToast(message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(client: Client) {
    if (
      !window.confirm(`Delete client "${client.name}"? This cannot be undone.`)
    ) {
      return
    }

    try {
      await deleteClient(client.id)
      showSuccessToast("Client deleted")
      await fetchClients()
    } catch (err) {
      showErrorToast(humanizeApiError(err, "Failed to delete client"))
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreateModal}>
          <Plus className="size-4" />
          Add Client
        </Button>
      </div>

      <Card>
        <CardHeader className="sr-only">
          <CardTitle>Clients</CardTitle>
          <CardDescription>Managed business contacts</CardDescription>
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
              <Button variant="outline" size="sm" onClick={() => void fetchClients({ showLoading: true })}>
                Retry
              </Button>
            </div>
          ) : sortedClients.length === 0 ? (
            <div className="flex flex-col items-center gap-3 p-12 text-center">
              <Building2 className="size-8 text-muted-foreground" />
              <div>
                <p className="font-medium">No clients yet</p>
                <p className="text-sm text-muted-foreground">
                  Convert a lead or add a client directly.
                </p>
              </div>
              <Button size="sm" onClick={openCreateModal}>
                <Plus className="size-4" />
                Add Client
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Linked Projects</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="w-[4rem] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedClients.map((client) => {
                  const linkedCount = projectCounts[client.id] ?? 0

                  return (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer"
                      onClick={() => openClientDetail(client.id)}
                    >
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell>{client.company ?? "—"}</TableCell>
                      <TableCell>{client.email}</TableCell>
                      <TableCell>{client.phone ?? "—"}</TableCell>
                      <TableCell>
                        {linkedCount > 0 ? (
                          <Link
                            to="/projects"
                            className="inline-flex focus-ring rounded-md"
                          >
                            <Badge variant="secondary" className="cursor-pointer">
                              {linkedCount}
                            </Badge>
                          </Link>
                        ) : (
                          <Badge variant="outline">0</Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatDateAdded(client.createdAt)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Actions for ${client.name}`}
                              onClick={(event) => event.stopPropagation()}
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => openClientDetail(client.id)}
                            >
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openEditModal(client)}
                            >
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => void handleDelete(client)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AddClientModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        submitting={submitting}
        error={formError}
        onSubmit={(values) => void handleCreate(values)}
      />

      <EditClientModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        client={selectedClient}
        submitting={submitting}
        error={formError}
        onSubmit={(values) => void handleEdit(values)}
      />

      <ClientDetailSheet
        clientId={activeViewClientId}
        open={activeViewClientId !== null}
        onOpenChange={(open) => {
          if (!open) {
            closeClientDetail()
          }
        }}
        onClientDeleted={() => void fetchClients()}
        onEdit={(client) => {
          closeClientDetail()
          openEditModal(client)
        }}
      />
    </div>
  )
}
