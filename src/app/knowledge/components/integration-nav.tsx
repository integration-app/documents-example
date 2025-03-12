"use client";

import { useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderStyle, setSliderStyle] = useState({ width: 0, left: 0 });

  const updateSliderPosition = (button: HTMLElement) => {
    if (!containerRef.current) return;
    const containerRect = containerRef.current.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    setSliderStyle({
      width: buttonRect.width,
      left: buttonRect.left - containerRect.left,
    });
  };

  return (
    <div className="relative mb-8">
      <div
        ref={containerRef}
        className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-lg w-full sm:w-fit relative"
      >
        <div
          className="absolute h-[calc(100%-8px)] bg-white rounded-md shadow-sm transition-all duration-300 ease-in-out"
          style={{
            width: sliderStyle.width,
            left: sliderStyle.left,
            top: "4px",
          }}
        />

        <button
          onClick={(e) => {
            onIntegrationSelect(null);
            updateSliderPosition(e.currentTarget);
          }}
          className={cn(
            "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 whitespace-nowrap relative z-10",
            selectedIntegration === null
              ? "text-gray-900"
              : "text-gray-500 hover:text-gray-900"
          )}
        >
          All
        </button>
        {integrations.map((integration) => (
          <button
            key={integration.integrationId}
            onClick={(e) => {
              onIntegrationSelect(integration.integrationId);
              updateSliderPosition(e.currentTarget);
            }}
            className={cn(
              "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 whitespace-nowrap relative z-10",
              selectedIntegration === integration.integrationId
                ? "text-gray-900"
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
