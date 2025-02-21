"use client";

import { Integration } from "@integration-app/sdk";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { DocumentPicker } from "@/app/integrations/components/document-picker";
import { usePolling } from "@/hooks/use-polling";
import { getAuthHeaders } from "@/app/auth-provider";
import Image from "next/image";
import { useIntegrationApp } from "@integration-app/react";
import { Icons } from "@/components/ui/icons";
import { toast } from "sonner";

interface IntegrationListItemProps {
  integration: Integration;
  onRefresh: () => Promise<void>;
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

  const { startPolling, stopPolling } = usePolling({
    url: `/api/integrations/${integration.connection?.id}/sync-status`,
    interval: 2000,
    onSuccess: (data) => {
      if (data.status === "completed" || data.status === "failed") {
        stopPolling();
        setIsSyncing(false);

        if (data.status === "completed") {
          setIsPickerOpen(true);
        }
      }
    },
  });

  const startSync = async ({ connectionId }: { connectionId: string }) => {
    setIsSyncing(true);

    try {
      await fetch(`/api/integrations/${connectionId}/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          integrationId: integration.key,
          integrationName: integration.name,
          integrationLogo: integration.logoUri,
        }),
      });

      // We want to check at interval of 2 seconds if the sync is completed
      startPolling();

      await onRefresh();
    } catch (error) {
      toast.error("Failed to sync documents", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsSyncing(false);
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

      await startSync({ connectionId: connection.id });
    } catch (error) {
      toast.error("Failed to connect", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      setIsConnecting(false);
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
        setIsSyncing={setIsSyncing}
      />

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
              disabled={isConnecting}
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
