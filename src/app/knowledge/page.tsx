"use client";

import { useState, useMemo } from "react";
import { getAuthHeaders } from "@/app/auth-provider";
import { Loader2Icon } from "lucide-react";
import { IntegrationNav } from "@/app/knowledge/components/integration-nav";
import { IntegrationCard } from "@/app/knowledge/components/integration-card";
import { filterIntegrationGroups, type IntegrationGroup } from "./utils";
import useSWR from "swr";

const Icons = {
  spinner: Loader2Icon,
} as const;

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
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
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
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
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
