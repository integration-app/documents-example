"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { getAuthHeaders } from "@/app/auth-provider";
import { Loader2Icon } from "lucide-react";
import { IntegrationNav } from "@/app/knowledge/components/integration-nav";
import { IntegrationCard } from "@/app/knowledge/components/integration-card";
import { filterIntegrationGroups, type IntegrationGroup } from "./utils";

const Icons = {
  spinner: Loader2Icon,
} as const;

export default function KnowledgePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [integrationGroups, setIntegrationGroups] = useState<
    IntegrationGroup[]
  >([]);
  const [selectedIntegration, setSelectedIntegration] = useState<string | null>(
    null
  );
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Start polling when component mounts
  useEffect(() => {
    const startPolling = () => {
      fetchSubscribedDocuments();
      pollingInterval.current = setInterval(() => {
        fetchSubscribedDocuments();
      }, 2000);
    };

    startPolling();
    return () => stopPolling();
  }, []);

  const stopPolling = () => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }
  };

  const fetchSubscribedDocuments = async (showLoadingState = false) => {
    try {
      if (showLoadingState) {
        setLoading(true);
      }

      const response = await fetch("/api/documents/subscribed", {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }

      const groups: IntegrationGroup[] = await response.json();
      setIntegrationGroups(groups);
    } catch (error) {
      console.error("Error fetching documents:", error);
      if (showLoadingState) {
        setError("Failed to load documents");
      }
    } finally {
      if (showLoadingState) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchSubscribedDocuments(true);
  }, []);

  const filteredIntegrationGroups = useMemo(
    () => filterIntegrationGroups(integrationGroups, selectedIntegration),
    [integrationGroups, selectedIntegration]
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Icons.spinner className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <div className="p-4 text-red-500 bg-red-50 rounded-md">{error}</div>
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
