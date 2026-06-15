import { useEffect, useMemo, useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import { listClients } from "@/lib/api"
import {
  clientOptionLabel,
  filterClients,
} from "@/lib/clients"
import { humanizeApiError, showErrorToast } from "@/lib/toast"
import { cn } from "@/lib/utils"
import type { Client } from "@/types/client"

interface ClientSelectorProps {
  value: string | null
  onChange: (clientId: string | null) => void
  disabled?: boolean
  id?: string
  /** Load the client list on mount (e.g. when embedded in a dialog). */
  loadOnMount?: boolean
}

export function ClientSelector({
  value,
  onChange,
  disabled = false,
  id = "project-client",
  loadOnMount = false,
}: ClientSelectorProps) {
  const [open, setOpen] = useState(false)
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    if (!open && !loadOnMount) {
      return
    }

    let cancelled = false

    async function loadClients() {
      setLoading(true)
      try {
        const data = await listClients()
        if (!cancelled) {
          setClients(data)
        }
      } catch (err) {
        if (!cancelled) {
          showErrorToast(humanizeApiError(err, "Failed to load clients"))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadClients()

    return () => {
      cancelled = true
    }
  }, [open, loadOnMount])

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === value) ?? null,
    [clients, value],
  )

  const filteredClients = useMemo(
    () => filterClients(clients, searchQuery),
    [clients, searchQuery],
  )

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Client</Label>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen)
          if (!nextOpen) {
            setSearchQuery("")
          }
        }}
      >
        <div className="flex gap-2">
          <PopoverTrigger asChild>
            <Button
              id={id}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className="min-w-0 flex-1 justify-between font-normal"
            >
              <span className="truncate">
                {selectedClient
                  ? clientOptionLabel(selectedClient)
                  : "Select a client…"}
              </span>
              <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          {value ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={disabled}
              aria-label="Unlink client"
              onClick={() => onChange(null)}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
        <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
          <div className="border-b p-2">
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search clients…"
              autoFocus
              aria-label="Search clients"
            />
          </div>
          <ScrollArea className="max-h-60">
            {loading ? (
              <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                <Spinner className="size-4" />
                Loading clients…
              </div>
            ) : filteredClients.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">
                {clients.length === 0 ? "No clients yet" : "No matching clients"}
              </p>
            ) : (
              <div className="p-1">
                {filteredClients.map((client) => {
                  const isSelected = client.id === value
                  return (
                    <button
                      key={client.id}
                      type="button"
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-2 text-left text-sm hover:bg-accent",
                        isSelected && "bg-accent/60",
                      )}
                      onClick={() => {
                        onChange(client.id)
                        setOpen(false)
                        setSearchQuery("")
                      }}
                    >
                      <span className="min-w-0 flex-1 truncate">
                        {clientOptionLabel(client)}
                      </span>
                      {isSelected ? (
                        <Check className="size-4 shrink-0" />
                      ) : null}
                    </button>
                  )
                })}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  )
}
