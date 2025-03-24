import { Document } from "@/models/document";
import {
  FileIcon,
  FolderIcon,
  ExternalLinkIcon,
  Loader2Icon,
  ChevronRightIcon,
  DownloadIcon,
  AlertCircleIcon,
  MoreVerticalIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadFileToDisk } from "../utils";
import { DownloadStateDisplay } from "./DownloadState";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import { DocumentViewer } from "./document-viewer";
import { useState } from "react";

const Icons = {
  file: FileIcon,
  folder: FolderIcon,
  chevronRight: ChevronRightIcon,
  externalLink: ExternalLinkIcon,
  spinner: Loader2Icon,
  download: DownloadIcon,
  error: AlertCircleIcon,
  moreVertical: MoreVerticalIcon,
} as const;

interface DocumentItemProps {
  document: Document;
  onItemClick?: (document: Document) => void;
  integrationName: string;
}

export function KnowledgeItem({
  document,
  integrationName,
  onItemClick: onFolderClick,
}: DocumentItemProps) {
  const isFolder = document.canHaveChildren;

  const [isViewingDocument, setIsViewingDocument] = useState<boolean>(false);

  return (
    <div
      className={`flex gap-3 p-2 hover:bg-gray-50 rounded-md ${
        isFolder ? "cursor-pointer" : ""
      }`}
      onClick={() => {
        if (isFolder) {
          onFolderClick?.(document);
        }
      }}
    >
      <div className="flex flex-col gap-2 flex-1">
        <div className="flex items-start gap-2">
          {isFolder ? (
            <Icons.folder className="h-4 w-4 text-gray-400" />
          ) : (
            <Icons.file className="h-4 w-4 text-gray-400" />
          )}
          <span className="text-sm font-medium leading-none">
            {document.title}
          </span>
          <span className="text-xs text-gray-400">
            {document.id.length > 24
              ? `${document.id.slice(0, 12)}...${document.id.slice(-12)}`
              : document.id}
          </span>
        </div>
        {document.updatedAt && (
          <p className="text-xs text-gray-500 ml-6">
            Updated {format(new Date(document.updatedAt), "MMM d, yyyy")}
          </p>
        )}
      </div>

      <div className="flex items-center space-x-2 justify-end">
        {document.downloadState && (
          <DownloadStateDisplay
            state={document.downloadState}
            integrationName={integrationName}
          />
        )}
        {document.downloadError && (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                title="View error"
              >
                <Icons.error className="h-4 w-4 text-destructive text-red-500" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-2">
              <div className="text-sm text-destructive">
                <p className="font-bold">Download failed</p>
                {document.downloadError}
              </div>
            </PopoverContent>
          </Popover>
        )}
        {document.content !== null && (
          <Button
            size="sm"
            className="p-2 rounded"
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              setIsViewingDocument(true);
            }}
          >
            <Icons.file className="h-4 w-4" />
          </Button>
        )}
        {(document.content !== null ||
          document.storageKey ||
          document.resourceURI) && (
          <DropdownMenu>
            <DropdownMenuTrigger
              asChild
              onClick={(e: React.MouseEvent) => e.stopPropagation()}
            >
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 focus:ring-0 focus-visible:ring-2"
              >
                <Icons.moreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px] b-2">
              {document.storageKey && (
                <DropdownMenuItem
                  onClick={(e: React.MouseEvent) => {
                    e.stopPropagation();
                    downloadFileToDisk(document.id, document.storageKey!);
                  }}
                >
                  <Icons.download className="h-4 w-4 mr-2" />
                  Download
                </DropdownMenuItem>
              )}
              {document.resourceURI && (
                <DropdownMenuItem asChild>
                  <a
                    href={document.resourceURI}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  >
                    <Icons.externalLink className="h-4 w-4 mr-2" />
                    View on {integrationName}
                  </a>
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <DocumentViewer
          documentId={document.id}
          title={document.title}
          open={isViewingDocument}
          onOpenChange={(open) => !open && setIsViewingDocument(false)}
        />

        {isFolder && <Icons.chevronRight className="h-4 w-4 text-gray-400" />}
      </div>
    </div>
  );
}
