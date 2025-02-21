"use client";

import { Integration } from "@integration-app/sdk";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { DocumentPicker } from "@/components/integration/document-picker";
import { usePolling } from "@/hooks/use-polling";
import { getAuthHeaders } from "@/app/auth-provider";
import Image from "next/image";
import { useIntegrationApp } from "@integration-app/react";
import { Icons } from "@/components/ui/icons";

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
  const [isLoading, setIsLoading] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const { startPolling, stopPolling } = usePolling({
    url: isLoading
      ? `/api/integrations/${integration.connection?.id}/sync-status`
      : "",
    interval: 2000,
    onSuccess: (data) => {
      if (data.status === "completed") {
        stopPolling();
        setIsLoading(false);
        setIsPickerOpen(true);
      }
    },
  });

  const handleConnect = async () => {
    try {
      setIsLoading(true);
      const connection = await integrationApp
        .integration(integration.key)
        .openNewConnection();

      if (!connection?.id) {
        throw new Error("No connection ID received");
      }

      // Start document sync
      await fetch(`/api/integrations/${connection.id}/sync`, {
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

      startPolling();
      await onRefresh();
    } catch (error) {
      console.error("Failed to connect:", error);
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!integration.connection?.id) return;

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
    } finally {
      setIsDisconnecting(false);
    }
  };

  return (
    <>
      <DocumentPicker
        integration={integration}
        onComplete={() => {
          setIsPickerOpen(false);
          router.push("/knowledge");
        }}
        onCancel={() => setIsPickerOpen(false)}
        open={isPickerOpen}
        onOpenChange={setIsPickerOpen}
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
          <div>
            <h3 className="font-medium">{integration.name}</h3>
            {integration.connection?.disconnected && (
              <p className="text-sm text-red-500">Disconnected</p>
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
                className="text-red-500"
              >
                {isDisconnecting ? (
                  <span>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    Disconnecting
                  </span>
                ) : (
                  "Disconnect"
                )}
              </Button>
            </>
          ) : (
            <Button
              onClick={handleConnect}
              variant="default"
              size="sm"
              disabled={isLoading}
            >
              {isLoading ? (
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
