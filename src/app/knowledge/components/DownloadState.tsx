import { Badge } from "@/components/ui/badge";
import { CheckIcon, Loader2Icon, XIcon } from "lucide-react";
import { DownloadState, DownloadStateType } from "@/types/download";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

interface DownloadStateDisplayProps {
  state: DownloadStateType;
  integrationName?: string;
}


export interface DownloadStateConfig {
  icon: React.ReactNode;
  text: string;
  variant: "default" | "secondary" | "destructive" | "outline";
}

const Icons = {
  spinner: Loader2Icon,
  check: CheckIcon,
  x: XIcon,
} as const;

export function DownloadStateDisplay({ state, integrationName }: DownloadStateDisplayProps) {
  if (state === DownloadState.FLOW_TRIGGERED) {
    return (
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger>
            <div className="flex items-center relative">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500/75 animate-ping" />
              <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500/50 animate-pulse" />
              <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500/25 animate-ping [animation-delay:150ms]" />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <span>Download flow triggered, Waiting on download webhook</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (state === DownloadState.DONE) {
    return null;
  }

  const stateConfig: Record<Extract<DownloadStateType, "DOWNLOADING_FROM_URL" | "EXTRACTING_TEXT" | "FAILED">, DownloadStateConfig> = {
    DOWNLOADING_FROM_URL: {
      icon: <Icons.spinner className="h-3 w-3 animate-spin" />,
      text: `Downloading${integrationName ? ` from ${integrationName}` : ""}`,
      variant: "secondary",
    },
    EXTRACTING_TEXT: {
      icon: <Icons.spinner className="h-3 w-3 animate-spin" />,
      text: "Extracting text from file",
      variant: "secondary",
    },
    FAILED: {
      icon: <Icons.x className="h-3 w-3" />,
      text: "Download Failed",
      variant: "destructive",
    },
  };

  const config = stateConfig[state];
  if (!config) return null;

  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      <span>{config.text}</span>
    </Badge>
  );
} 