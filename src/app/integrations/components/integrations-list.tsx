"use client";

import { useIntegrations } from "@integration-app/react";
import { Icons } from "@/components/ui/icons";
import { IntegrationListItem } from "./integration-list-item";

export function IntegrationList() {
  const {
    integrations,
    refresh,
    loading: integrationsIsLoading,
  } = useIntegrations();

  return (
    <div>
      {integrationsIsLoading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Icons.spinner className="h-8 w-8 animate-spin mb-2" />
          <p className="text-sm text-muted-foreground">
            Loading integrations...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {integrations.map((integration) => (
            <IntegrationListItem
              key={integration.key}
              integration={integration}
              onRefresh={refresh}
            />
          ))}
        </div>
      )}
    </div>
  );
}
