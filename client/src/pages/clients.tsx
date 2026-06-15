import { useSearchParams } from "react-router-dom"
import { ClientsTab } from "@/components/client-management/clients-tab"
import { LeadsTab } from "@/components/client-management/leads-tab"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const TAB_PARAM = "tab"
type ClientsPageTab = "leads" | "clients"

function parseTab(value: string | null): ClientsPageTab {
  return value === "leads" ? "leads" : "clients"
}

export function ClientsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab =
    searchParams.get("lead") !== null
      ? "leads"
      : parseTab(searchParams.get(TAB_PARAM))

  function handleTabChange(value: string) {
    const next = new URLSearchParams(searchParams)
    if (value === "clients") {
      next.delete(TAB_PARAM)
    } else {
      next.set(TAB_PARAM, value)
    }
    setSearchParams(next, { replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="type-page-title">Client Management</h2>
        <p className="text-muted-foreground">
          Track leads through the pipeline and manage client relationships.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
        </TabsList>

        <TabsContent value="leads" className="mt-4">
          <LeadsTab />
        </TabsContent>

        <TabsContent value="clients" className="mt-4">
          <ClientsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
