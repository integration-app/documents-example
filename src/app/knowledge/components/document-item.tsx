import { Document } from "@/models/document";
import { format } from "date-fns";
import {
  FileIcon,
  FolderIcon,
  ExternalLinkIcon,
  Loader2Icon,
  ChevronRightIcon,
  DownloadIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { downloadFileToDisk } from "../utils";

const Icons = {
  file: FileIcon,
  folder: FolderIcon,
  chevronRight: ChevronRightIcon,
  externalLink: ExternalLinkIcon,
  spinner: Loader2Icon,
  download: DownloadIcon,
} as const;

interface DocumentItemProps {
  document: Document;
  onItemClick?: (id: string, title: string) => void;
  onClickViewContent?: (document: Document) => void;
  integrationName: string;
}

export function DocumentItem({
  document,
  integrationName,
  onItemClick: onFolderClick,
  onClickViewContent,
}: DocumentItemProps) {
  const isFolder = document.canHaveChildren;

  const handleClick = () => {
    if (isFolder && onFolderClick) {
      onFolderClick(document.id, document.title);
    }
  };

  return (
    <div
      className={`flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md ${
        isFolder ? "cursor-pointer" : ""
      }`}
      onClick={handleClick}
    >
      {isFolder ? (
        <Icons.folder className="h-4 w-4 text-gray-400" />
      ) : (
        <Icons.file className="h-4 w-4 text-gray-400" />
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{document.title}</p>
          <span className="text-xs text-gray-400">
            {document.id.length > 24
              ? `${document.id.slice(0, 12)}...${document.id.slice(-12)}`
              : document.id}
          </span>
        </div>
        {document.updatedAt && (
          <p className="text-xs text-gray-500">
            Updated {format(new Date(document.updatedAt), "MMM d, yyyy")}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {document.isDownloading && (
          <Badge variant="secondary" className="gap-1">
            <Icons.spinner className="h-3 w-3 animate-spin" />
            <span>Downloading from {integrationName}</span>
          </Badge>
        )}

        {document.isExtractingText && (
          <Badge variant="secondary" className="gap-1">
            <Icons.spinner className="h-3 w-3 animate-spin" />
            <span>Extracting text from file</span>
          </Badge>
        )}

        {document.content && (
          <Button
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onClickViewContent?.(document);
            }}
            className="h-8 w-8 p-0"
            title="View content"
          >
            <Icons.file className="h-4 w-4" />
          </Button>
        )}

        {!isFolder && (
          <>
            {!document.isDownloading && (
              <>
                {document.storageKey && (
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadFileToDisk(document.id, document.storageKey!);
                    }}
                    className="h-8 w-8 p-0"
                    title="Download document"
                  >
                    <Icons.download className="h-4 w-4" />
                  </Button>
                )}
                {document.resourceURI && (
                  <a
                    href={document.resourceURI}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600 h-8 w-8 flex items-center justify-center"
                    title="Open preview"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Icons.externalLink className="h-4 w-4" />
                  </a>
                )}
              </>
            )}
          </>
        )}
      </div>

      {isFolder && <Icons.chevronRight className="h-4 w-4 text-gray-400" />}
    </div>
  );
}
