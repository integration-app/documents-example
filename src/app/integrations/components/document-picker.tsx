import { useState, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { getAuthHeaders } from "@/app/auth-provider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Integration } from "@integration-app/sdk";
import { Input } from "@/components/ui/input";
import { Document } from "@/models/document";
import {
  FileIcon,
  RefreshCcwIcon,
  Loader2Icon,
  ExternalLinkIcon,
  ChevronRightIcon,
  FolderIcon,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { useDocumentNavigation } from "../hooks/use-document-navigation";
import useSWR from "swr";

const Icons = {
  file: FileIcon,
  folder: FolderIcon,
  chevronRight: ChevronRightIcon,
  refresh: RefreshCcwIcon,
  spinner: Loader2Icon,
  externalLink: ExternalLinkIcon,
} as const;

interface BreadcrumbItem {
  id: string;
  title: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate: (index: number) => void;
}

function Breadcrumbs({ items, onNavigate }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex items-center flex-wrap gap-2 px-4 py-2 text-sm text-gray-500 bg-gray-50 rounded-md">
      <button
        onClick={() => onNavigate(-1)}
        className="hover:text-gray-900 transition-colors"
      >
        Root
      </button>
      {items.map((crumb, index) => (
        <div key={crumb.id} className="flex items-center gap-2">
          <Icons.chevronRight className="h-4 w-4 text-gray-400" />
          <button
            onClick={() => onNavigate(index)}
            className="hover:text-gray-900 transition-colors"
          >
            {crumb.title}
          </button>
        </div>
      ))}
    </div>
  );
}

interface DocumentListProps {
  folders: Document[];
  files: Document[];
  onFolderClick: (id: string, title: string) => void;
  onSubscribe: (document: Document) => void;
  isSubscribing: boolean;
}

function DocumentList({
  folders,
  files,
  onFolderClick,
  onSubscribe,
}: DocumentListProps) {
  if (folders.length === 0 && files.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-gray-500">No items found</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {folders.map((folder) => (
        <div
          key={folder.id}
          className="flex items-center gap-3 py-2 px-4 hover:bg-gray-50 cursor-pointer"
          onClick={() => onFolderClick(folder.id, folder.title)}
        >
          <Checkbox
            checked={folder.isSubscribed}
            onCheckedChange={() => onSubscribe(folder)}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Icons.folder className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <span
              className={cn("truncate", {
                "text-blue-600": folder.isSubscribed,
              })}
            >
              {folder.title}
            </span>
          </div>
          <Icons.chevronRight className="h-4 w-4 text-gray-400" />
        </div>
      ))}

      {files.map((document) => (
        <div
          key={document.id}
          className="flex items-center gap-3 py-2 px-4 hover:bg-gray-50 cursor-pointer"
          onClick={() => onSubscribe(document)}
        >
          <Checkbox
            checked={document.isSubscribed}
            onCheckedChange={() => onSubscribe(document)}
            onClick={(e) => e.stopPropagation()}
          />
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <Icons.file className="h-4 w-4 flex-shrink-0 text-gray-400" />
            <span
              className={cn("truncate", {
                "text-blue-600": document.isSubscribed,
              })}
            >
              {document.title}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

interface LoadingStateProps {
  message: string;
}

function LoadingState({ message }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Icons.spinner className="h-8 w-8 animate-spin mb-4" />
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="mb-4 p-4 text-red-500 bg-red-50 rounded-md">
        {message}
      </div>
      <Button onClick={onRetry} variant="outline">
        Try Again
      </Button>
    </div>
  );
}

interface DocumentPickerProps {
  integration: Integration;
  onComplete: () => void;
  onCancel: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSyncing: boolean;
  handleStartSync: (params: { connectionId: string }) => Promise<void>;
}

function useDocumentSync(connectionId: string | undefined, isSyncing: boolean) {
  type DocumentResponse = {
    documents: Document[];
  };

  const {
    data: documents = [],
    error,
    isLoading,
    mutate,
  } = useSWR<Document[]>(
    connectionId ? `/api/integrations/${connectionId}/documents` : null,
    async (url: string) => {
      const response = await fetch(url, { headers: getAuthHeaders() });
      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }
      const data = (await response.json()) as DocumentResponse;
      return data.documents || [];
    },
    {
      refreshInterval: isSyncing ? 2000 : 0,
      revalidateOnFocus: !isSyncing,
      onError: (err: Error) => {
        console.error("Error fetching documents:", err);
      },
    }
  );

  return {
    documents,
    setDocuments: (newDocuments: Document[]) => mutate(newDocuments, false),
    loading: isLoading,
    error: error?.message || null,
    fetchDocuments: () => mutate(),
  };
}

export function DocumentPicker({
  integration,
  onComplete,
  onCancel,
  open,
  onOpenChange,
  isSyncing,
  handleStartSync,
}: DocumentPickerProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);

  const { documents, setDocuments, loading, error } = useDocumentSync(
    integration.connection?.id,
    isSyncing
  );

  const {
    currentFolders,
    currentFiles,
    breadcrumbs,
    navigateToFolder,
    navigateToBreadcrumb,
  } = useDocumentNavigation(documents, searchQuery);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  /**
   * Once a document is toggled, we need to update it's state and all it's children
   * in the local state and then persist the state to the backend.
   *
   * The backend will update the state of the documents in the database
   * and fire off other calls Get the documents associate file and or text
   */
  const subscribeDocument = async (document: Document) => {
    setIsSubscribing(true);

    const currentDocuments = [...documents];

    // Get all documents that should be toggled
    const documentsToUpdate = document.canHaveChildren
      ? [document.id, ...getDocumentsInFolder(document.id).map((doc) => doc.id)]
      : [document.id];

    const newSubscriptionState = !document.isSubscribed;

    const newDocuments = documents.map((doc) => {
      if (documentsToUpdate.includes(doc.id)) {
        return { ...doc, isSubscribed: newSubscriptionState };
      }
      return doc;
    });

    /**
     * Update state optimistically
     */
    setDocuments(newDocuments);

    const payload = {
      documentIds: documentsToUpdate,
      isSubscribed: newSubscriptionState,
    };

    /**
     * Persist state to backend
     */
    try {
      const response = await fetch(
        `/api/integrations/${integration.connection?.id}/documents/subscribe`,
        {
          method: "PATCH",
          body: JSON.stringify(payload),
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
        }
      );

      if (!response.ok) {
        /**
         * Reverse optimistic update since the database update failed
         */
        setDocuments(currentDocuments);
      }
    } catch (error) {
      /**
       * Reverse optimistic update since the database update failed
       */
      setDocuments(currentDocuments);

      toast.error("Failed to update subscription: " + error);
    } finally {
      setIsSubscribing(false);
    }
  };

  // Recursively get all documents inside a folder
  const getDocumentsInFolder = (folderId: string): Document[] => {
    const result: Document[] = [];
    const children = documents.filter((doc) => doc.parentId === folderId);

    for (const child of children) {
      result.push(child);
      if (child.canHaveChildren) {
        result.push(...getDocumentsInFolder(child.id));
      }
    }

    return result;
  };

  const handleDone = () => {
    onComplete();
    onOpenChange(false);
  };

  const reSync = async () => {
    setDocuments([]);

    if (integration.connection?.id) {
      handleStartSync({ connectionId: integration.connection.id });
    }
  };

  const renderContent = () => {
    if (documents.length === 0) {
      if (loading && !isSyncing)
        return <LoadingState message="Loading documents..." />;
      if (isSyncing) return <LoadingState message="Syncing documents..." />;
      if (error) return <ErrorState message={error} onRetry={() => {}} />;
    }
    return (
      <div className="space-y-4">
        <Breadcrumbs items={breadcrumbs} onNavigate={navigateToBreadcrumb} />
        <DocumentList
          folders={currentFolders}
          files={currentFiles}
          onFolderClick={navigateToFolder}
          onSubscribe={subscribeDocument}
          isSubscribing={isSubscribing}
        />
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              {integration.logoUri ? (
                <Image
                  width={32}
                  height={32}
                  src={integration.logoUri}
                  alt={`${integration.name} logo`}
                  className="w-8 h-8 rounded-lg"
                />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                  {integration.name[0]}
                </div>
              )}
              <DialogTitle>{integration.name}</DialogTitle>
            </div>
            {isSyncing && (
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                <Icons.spinner className="h-3 w-3 animate-spin" />
                <span>{documents.length} Documents Synced</span>
              </div>
            )}

            {!loading && !isSyncing && documents?.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={reSync}
                className="whitespace-nowrap"
              >
                <Icons.refresh className="h-4 w-4 mr-2" />
                Resync
              </Button>
            )}
          </div>

          <div className="flex justify-between items-center gap-4">
            <Input
              ref={searchInputRef}
              placeholder="Search documents..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="flex-1"
            />
          </div>
        </DialogHeader>

        <div className="min-h-[400px] max-h-[400px] overflow-y-auto my-6">
          {renderContent()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSyncing}>
            Cancel
          </Button>
          <Button onClick={handleDone}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
