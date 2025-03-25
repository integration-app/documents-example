"use client";

import { useMemo } from "react";
import { getAuthHeaders } from "@/app/auth-provider";
import { IntegrationNav } from "@/app/knowledge/components/integration-nav";
import { IntegrationCard } from "@/app/knowledge/components/integration-card";
import { filterIntegrationGroups, type IntegrationGroup } from "./utils";
import useLocalStorage from "@/hooks/use-local-storage";
import useSWR from "swr";

function LoadingSkeleton() {
  return (
    <div className="container mx-auto py-8 animate-in fade-in-50">
      <div className="h-10 w-48 bg-gray-200 rounded-md mb-8 animate-pulse" />

      {/* Navigation skeleton */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-8 w-32 bg-gray-200 rounded-md animate-pulse"
          />
        ))}
      </div>

      {/* Integration cards skeleton */}
      <div className="space-y-8">
        {[1, 2].map((i) => (
          <div key={i} className="border rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-gray-200 rounded-md animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-48 bg-gray-200 rounded-md animate-pulse" />
                <div className="h-4 w-32 bg-gray-200 rounded-md animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="h-24 bg-gray-200 rounded-md animate-pulse"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const fetcher = async (url: string) => {
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch documents");
  }

  return response.json();
};

export default function KnowledgePage() {
  const [selectedIntegration, setSelectedIntegration] = useLocalStorage<string | null>(
    'selectedIntegration',
    null
  );

  const {
    data: integrationGroups = [],
    error,
    isLoading,
  } = useSWR<IntegrationGroup[]>("/api/documents/subscribed", fetcher, {
    refreshInterval: 2000,
    revalidateOnFocus: true,
    revalidateOnReconnect: true,
  });

  const filteredIntegrationGroups = useMemo(
    () => filterIntegrationGroups(integrationGroups, selectedIntegration),
    [integrationGroups, selectedIntegration]
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="p-4 text-red-500 bg-red-50 rounded-md">
          Failed to load documents
        </div>
      </div>
    );
  }

  if (integrationGroups.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <h1 className="text-2xl font-bold mb-6">Knowledge Base</h1>
        <p className="text-gray-500">
          No subscribed documents found. Connect an integration to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Knowledge Base</h1>

      <IntegrationNav
        integrations={integrationGroups.map((group) => ({
          integrationId: group.integrationId,
          integrationName: group.integrationName,
        }))}
        selectedIntegration={selectedIntegration}
        onIntegrationSelect={setSelectedIntegration}
      />

      <div className="space-y-8">
        {filteredIntegrationGroups.map((integration) => (
          <IntegrationCard
            key={integration.integrationId}
            connectionId={integration.connectionId}
            integrationId={integration.integrationId}
            integrationName={integration.integrationName}
            integrationLogo={integration.integrationLogo}
            documents={integration.documents}
          />
        ))}
      </div>
    </div>
  );
}
