import { useState, useEffect, useRef } from "react";
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

const Icons = {
  file: FileIcon,
  folder: FolderIcon,
  chevronRight: ChevronRightIcon,
  refresh: RefreshCcwIcon,
  spinner: Loader2Icon,
  externalLink: ExternalLinkIcon,
} as const;

interface DocumentPickerProps {
  integration: Integration;
  onComplete: () => void;
  onCancel: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface BreadcrumbItem {
  id: string;
  title: string;
}

export function DocumentPicker({
  integration,
  onComplete,
  onCancel,
  open,
  onOpenChange,
}: DocumentPickerProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);
  const [checkedInitialSync, setCheckedInitialSync] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    if (open && integration.connection?.id && !checkedInitialSync) {
      checkSyncStatus();
    }
  }, [open, integration.connection?.id, checkedInitialSync]);

  const checkSyncStatus = async () => {
    if (!integration.connection?.id) return;

    try {
      const response = await fetch(
        `/api/integrations/${integration.connection.id}/sync-status`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) {
        throw new Error("Failed to check sync status");
      }

      const data = await response.json();

      if (data.status === "in_progress") {
        setSyncing(true);
        startPolling();
      } else {
        setCheckedInitialSync(true);
        fetchDocuments();
      }
    } catch (error) {
      console.error("Error checking sync status:", error);
      setError("Failed to check sync status");
      setCheckedInitialSync(true);
    }
  };

  const startPolling = () => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/integrations/${integration.connection?.id}/sync-status`,
          { headers: getAuthHeaders() }
        );

        if (!response.ok) {
          throw new Error("Failed to check sync status");
        }

        const data = await response.json();

        if (data.status === "completed") {
          clearInterval(pollInterval);
          setSyncing(false);
          setCheckedInitialSync(true);
          fetchDocuments();
        } else if (data.status === "failed") {
          clearInterval(pollInterval);
          setSyncing(false);
          setCheckedInitialSync(true);
          setError("Sync failed: " + (data.error || "Unknown error"));
        }
      } catch (error) {
        clearInterval(pollInterval);
        setSyncing(false);
        setCheckedInitialSync(true);
        setError("Failed to check sync status");
        console.error("Sync status error:", error);
      }
    }, 2000);

    return pollInterval;
  };

  const startSync = async () => {
    if (!integration.connection?.id) return;

    setSyncing(true);
    setError(null);

    try {
      const syncResponse = await fetch(
        `/api/integrations/${integration.connection.id}/sync`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            integrationId: integration.key,
            integrationName: integration.name,
            integrationLogo: integration.logoUri,
          }),
        }
      );

      if (!syncResponse.ok) {
        throw new Error("Failed to start sync");
      }

      startPolling();
    } catch (error) {
      console.error("Failed to start sync:", error);
      setError("Failed to start sync");
      setSyncing(false);
    }
  };

  const fetchDocuments = async () => {
    if (!integration.connection?.id) return;

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/integrations/${integration.connection.id}/documents`,
        { headers: getAuthHeaders() }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch documents");
      }

      const { documents: fetchedDocuments } = await response.json();
      setDocuments(fetchedDocuments || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      setError("Failed to load documents");
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  // Effect for initial load only
  useEffect(() => {
    if (open && integration.connection?.id) {
      fetchDocuments();
    }
  }, [open, integration.connection?.id]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  // Recursively get all documents inside a folder
  const getDocumentsInFolder = (folderId: string): Document[] => {
    const result: Document[] = [];

    // Get immediate children
    const children = documents.filter((doc) => doc.parentId === folderId);

    for (const child of children) {
      result.push(child);
      // If child is a folder, get its contents recursively
      if (child.canHaveChildren) {
        result.push(...getDocumentsInFolder(child.id));
      }
    }

    return result;
  };

  // Update the folder and file filtering logic
  const getFilteredDocuments = () => {
    let filtered = documents;

    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase();
      filtered = documents.filter((doc) =>
        doc.title.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  };

  // Get folders at current level
  const currentFolders = getFilteredDocuments().filter((doc) => {
    if (currentFolderId === null) {
      // At root level, show documents with no folderId
      return doc.canHaveChildren && !doc.parentId;
    }
    return doc.canHaveChildren && doc.parentId === currentFolderId;
  });

  // Get documents at current level
  const currentFiles = getFilteredDocuments().filter((doc) => {
    if (currentFolderId === null) {
      // At root level, show documents with no folderId
      return doc.canHaveChildren === false && !doc.parentId;
    }
    return doc.canHaveChildren === false && doc.parentId === currentFolderId;
  });

  const navigateToFolder = (folderId: string, folderTitle: string) => {
    setCurrentFolderId(folderId);
    setBreadcrumbs((prev) => [...prev, { id: folderId, title: folderTitle }]);
  };

  const navigateToBreadcrumb = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    const targetFolder = index === -1 ? null : newBreadcrumbs[index].id;
    setCurrentFolderId(targetFolder);
    setBreadcrumbs(newBreadcrumbs);
  };

  const renderBreadcrumbs = () => {
    if (breadcrumbs.length === 0) return null;

    return (
      <div className="flex items-center flex-wrap gap-2 px-4 py-2 text-sm text-gray-500 bg-gray-50 rounded-md">
        <button
          onClick={() => navigateToBreadcrumb(-1)}
          className="hover:text-gray-900 transition-colors"
        >
          Root
        </button>
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id} className="flex items-center gap-2">
            <Icons.chevronRight className="h-4 w-4 text-gray-400" />
            <button
              onClick={() => navigateToBreadcrumb(index)}
              className="hover:text-gray-900 transition-colors"
            >
              {crumb.title}
            </button>
          </div>
        ))}
      </div>
    );
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

  const handleDone = () => {
    onComplete();
    onOpenChange(false);
  };

  const renderContent = () => {
    if (loading || syncing) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <Icons.spinner className="h-8 w-8 animate-spin mb-4" />
          <p className="text-sm text-gray-500">
            {syncing ? "Syncing documents..." : "Loading documents..."}
          </p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-4 p-4 text-red-500 bg-red-50 rounded-md">
            {error}
          </div>
          <Button onClick={startSync} variant="outline">
            Try Again
          </Button>
        </div>
      );
    }

    const hasContent = currentFolders.length > 0 || currentFiles.length > 0;

    return (
      <div className="space-y-4">
        {renderBreadcrumbs()}

        {!hasContent ? (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-gray-500">This folder is empty</p>
          </div>
        ) : (
          <div className="space-y-2">
            {currentFolders.map((folder) => (
              <div
                key={folder.id}
                className="flex items-center gap-3 py-2 px-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => navigateToFolder(folder.id, folder.title)}
              >
                <Checkbox
                  checked={folder.isSubscribed}
                  onCheckedChange={() => {
                    subscribeDocument(folder);
                  }}
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

            {currentFiles.map((document) => (
              <div
                key={document.id}
                className="flex items-center gap-3 py-2 px-4 hover:bg-gray-50 cursor-pointer"
                onClick={() => subscribeDocument(document)}
              >
                <Checkbox
                  checked={document.isSubscribed}
                  onCheckedChange={() => subscribeDocument(document)}
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
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-4">
            {integration.logoUri ? (
              <img
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

          <div className="flex justify-between items-center gap-4">
            <Input
              ref={searchInputRef}
              placeholder="Search documents..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="flex-1"
              disabled={loading || syncing}
            />
            {!loading && !syncing && documents?.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={startSync}
                className="whitespace-nowrap"
              >
                <Icons.refresh className="h-4 w-4 mr-2" />
                Resync
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="min-h-[400px] max-h-[400px] overflow-y-auto my-6">
          {renderContent()}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={syncing}>
            Cancel
          </Button>
          <Button onClick={handleDone} disabled={isSubscribing}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
