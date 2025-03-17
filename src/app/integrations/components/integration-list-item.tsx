"use client";

import { Integration } from "@integration-app/sdk";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { DocumentPicker } from "@/app/integrations/components/document-picker";
import { getAuthHeaders } from "@/app/auth-provider";
import Image from "next/image";
import { useIntegrationApp } from "@integration-app/react";
import { Icons } from "@/components/ui/icons";
import { toast } from "sonner";
import { startSync } from "@/lib/integration-api";
import useSWR from "swr";

interface IntegrationListItemProps {
  integration: Integration;
  onRefresh: () => Promise<void>;
}

interface SyncStatus {
  status: "in_progress" | "completed" | "failed";
}

export function IntegrationListItem({
  integration,
  onRefresh,
}: IntegrationListItemProps) {
  const router = useRouter();
  const integrationApp = useIntegrationApp();
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const { mutate: mutateSyncStatus } = useSWR<SyncStatus>(
    integration.connection?.id
      ? `/api/integrations/${integration.connection.id}/sync-status`
      : null,
    async (url) => {
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (!response.ok) throw new Error("Failed to fetch sync status");
      return response.json();
    },
    {
      refreshInterval: isSyncing ? 2000 : 0,
      onSuccess: (data) => {
        if (data.status === "in_progress") {
          setIsSyncing(true);
        } else {
          setIsSyncing(false);
        }
      },
      onError: (error) => {
        console.error("Error fetching sync status:", error);
        setIsSyncing(false);
      },
    }
  );

  const handleStartSync = async ({
    connectionId,
  }: {
    connectionId: string;
  }) => {
    setIsSyncing(true);

    try {
      await startSync(connectionId, {
        key: integration.key,
        name: integration.name,
        logoUri: integration.logoUri,
      });

      // Trigger immediate revalidation of sync status
      mutateSyncStatus();
    } catch (error) {
      setIsSyncing(false);
      toast.error("Failed to sync documents", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);

      const connection = await integrationApp
        .integration(integration.key)
        .openNewConnection();

      if (!connection?.id) {
        throw new Error("No connection ID received");
      }

      setIsConnecting(false);
      await handleStartSync({ connectionId: connection.id });
    } catch (error) {
      setIsConnecting(false);

      toast.error("Failed to connect", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  };

  const handleDisconnect = async () => {
    if (!integration.connection?.id) {
      return;
    }

    try {
      setIsDisconnecting(true);
      await fetch(`/api/integrations/${integration.connection.id}/knowledge`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      await integrationApp.connection(integration.connection.id).archive();
      await onRefresh();
    } catch (error) {
      console.error("Failed to disconnect:", error);
      toast.error("Failed to disconnect", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <>
      {isPickerOpen && (
        <DocumentPicker
          isSyncing={isSyncing}
          integration={integration}
          onComplete={() => {
            setIsPickerOpen(false);
            router.push("/knowledge");
          }}
          onCancel={() => setIsPickerOpen(false)}
          open={isPickerOpen}
          onOpenChange={setIsPickerOpen}
          handleStartSync={handleStartSync}
        />
      )}

      <div className="flex items-center justify-between p-4 pl-0 bg-white rounded-lg border-b">
        <div className="flex items-center gap-4">
          {integration.logoUri ? (
            <Image
              width={40}
              height={40}
              src={integration.logoUri}
              alt={`${integration.name} logo`}
              className="w-10 h-10 rounded-lg"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
              {integration.name[0]}
            </div>
          )}

          <div className="flex  gap-2">
            <h3 className="font-medium">{integration.name}</h3>
            {integration.connection?.disconnected && (
              <p className="text-sm text-red-500">Disconnected</p>
            )}

            {isSyncing && (
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                <Icons.spinner className="h-3 w-3 animate-spin" />
                <span>Syncing...</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {integration.connection && !integration.connection.disconnected ? (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsPickerOpen(true)}
              >
                <Settings className="w-4 h-4 mr-2" />
                Configure
              </Button>
              <Button
                variant="ghost"
                onClick={handleDisconnect}
                size="sm"
                disabled={isDisconnecting}
                className="w-[100px]"
              >
                {isDisconnecting ? (
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <span className="text-red-500">Disconnect</span>
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleConnect}
              variant="default"
              size="sm"
              disabled={isConnecting || isSyncing}
            >
              {isConnecting ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                  Connecting
                </>
              ) : (
                "Connect"
              )}
            </Button>
          )}
        </div>
      </div>
    </>
  );
}
