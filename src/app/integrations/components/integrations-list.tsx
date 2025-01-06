"use client"

import { useIntegrationApp, useIntegrations } from "@integration-app/react"
import { Integration } from "@integration-app/sdk"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Settings } from "lucide-react"
import { DocumentPicker } from "@/components/integration/document-picker"
import { usePolling } from "@/hooks/use-polling"
import { getAuthHeaders } from "@/app/auth-provider"

export function IntegrationList() {
  const router = useRouter()
  const integrationApp = useIntegrationApp()
  const { integrations, refresh } = useIntegrations()
  const [selectedIntegration, setSelectedIntegration] = useState<Integration | null>(null)
  const [isPickerOpen, setIsPickerOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const { startPolling, stopPolling } = usePolling({
    url: selectedIntegration ? 
      `/api/integrations/${selectedIntegration.connection?.id}/sync-status` : '',
    interval: 2000,
    onSuccess: (data) => {
      if (data.status === 'completed') {
        stopPolling()
        setIsLoading(false)
        setIsPickerOpen(true)
      }
    }
  })

  const handleConnect = async (integration: Integration) => {
    try {
      const connection = await integrationApp.integration(integration.key).openNewConnection()
      if (!connection?.id) {
        throw new Error('No connection ID received')
      }
      console.log('connection', connection)
      setSelectedIntegration(integration)
      
      // Start document sync
      await fetch(`/api/integrations/${connection.id}/sync`, { 
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          integrationId: integration.key,
          integrationName: integration.name,
          integrationLogo: integration.logoUri
        })
      })
      startPolling()
      
      await refresh()
    } catch (error) {
      console.error("Failed to connect:", error)
      setIsLoading(false)
    }
  }

  const handleDisconnect = async (integration: Integration) => {
    if (!integration.connection?.id) return;
    
    try {
      // First delete knowledge
      await fetch(`/api/integrations/${integration.connection.id}/knowledge`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });

      // Then archive connection
      await integrationApp.connection(integration.connection.id).archive();
      
      setSelectedIntegration(null);
      refresh();
    } catch (error) {
      console.error("Failed to disconnect:", error);
    }
  };

  return (
    <>
      {selectedIntegration && (
        <DocumentPicker
          integration={selectedIntegration}
          onComplete={() => {
            setIsPickerOpen(false)
            setSelectedIntegration(null)
            router.push('/knowledge')
          }}
          onCancel={() => setIsPickerOpen(false)}
          open={isPickerOpen}
          onOpenChange={setIsPickerOpen}
        />
      )}

      <div className="space-y-4">
        {integrations.map((integration) => (
          <div
            key={integration.key}
            className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
          >
            <div className="flex items-center gap-4">
              {integration.logoUri ? (
                <img
                  src={integration.logoUri}
                  alt={`${integration.name} logo`}
                  className="w-10 h-10 rounded-lg"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                  {integration.name[0]}
                </div>
              )}
              <div>
                <h3 className="font-medium">{integration.name}</h3>
                {integration.connection?.disconnected && (
                  <p className="text-sm text-red-500">Disconnected</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {integration.connection && !integration.connection.disconnected && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedIntegration(integration)
                    setIsPickerOpen(true)
                  }}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
              )}
              <Button
                onClick={() =>
                  integration.connection
                    ? handleDisconnect(integration)
                    : handleConnect(integration)
                }
                variant={integration.connection ? "destructive" : "default"}
                size="sm"
                disabled={isLoading}
              >
                {isLoading && selectedIntegration?.key === integration.key
                  ? "Connecting..."
                  : integration.connection
                  ? "Disconnect"
                  : "Connect"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
