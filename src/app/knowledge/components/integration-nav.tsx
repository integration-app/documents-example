"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface Integration {
  integrationId: string;
  integrationName: string;
}

interface IntegrationNavProps {
  integrations: Integration[];
  selectedIntegration: string | null;
  onIntegrationSelect: (integrationId: string | null) => void;
}

export function IntegrationNav({
  integrations,
  selectedIntegration,
  onIntegrationSelect,
}: IntegrationNavProps) {
  useEffect(() => {
    const savedIntegration = localStorage.getItem("selectedIntegration");
    if (savedIntegration) {
      onIntegrationSelect(savedIntegration);
    }
  }, [onIntegrationSelect]);

  // Save selected integration to localStorage whenever it changes
  useEffect(() => {
    if (selectedIntegration) {
      localStorage.setItem("selectedIntegration", selectedIntegration);
    } else {
      localStorage.removeItem("selectedIntegration");
    }
  }, [selectedIntegration]);

  return (
    <div className="relative mb-8">
      <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-lg w-full sm:w-fit">
        <button
          onClick={() => onIntegrationSelect(null)}
          className={cn(
            "px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap",
            selectedIntegration === null
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-900"
          )}
        >
          All
        </button>
        {integrations.map((integration) => (
          <button
            key={integration.integrationId}
            onClick={() => onIntegrationSelect(integration.integrationId)}
            className={cn(
              "px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 whitespace-nowrap",
              selectedIntegration === integration.integrationId
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-900"
            )}
          >
            {integration.integrationName}
          </button>
        ))}
      </div>
    </div>
  );
}
