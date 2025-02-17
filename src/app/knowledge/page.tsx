"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { getAuthHeaders } from "@/app/auth-provider";
import { Document } from "@/models/document";
import {
  FileIcon,
  FolderIcon,
  ExternalLinkIcon,
  Loader2Icon,
  ChevronRightIcon,
  DownloadIcon,
  RefreshCwIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { DocumentViewer } from "@/components/document-viewer";
import { Badge } from "@/components/ui/badge";

const Icons = {
  file: FileIcon,
  folder: FolderIcon,
  chevronRight: ChevronRightIcon,
  externalLink: ExternalLinkIcon,
  spinner: Loader2Icon,
  download: DownloadIcon,
  refresh: RefreshCwIcon,
} as const;

interface IntegrationGroup {
  connectionId: string;
  integrationId: string;
  integrationName: string;
  integrationLogo: string;
  documents: Document[];
}

interface DocumentMap {
  [connectionId: string]: {
    [parentId: string]: Document[];
  };
}

export default function KnowledgePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [integrationGroups, setIntegrationGroups] = useState<
    IntegrationGroup[]
  >([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<
    Array<{ id: string; title: string }>
  >([]);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const [documentMap, setDocumentMap] = useState<DocumentMap>({});

  // Add polling interval ref
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Start polling when component mounts
  useEffect(() => {
    const startPolling = () => {
      // Initial fetch
      fetchSubscribedDocuments();

      // Set up polling every 2 seconds
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

  const downloadFileToDisk = async (docId: string, storageKey: string) => {
    try {
      const response = await fetch(
        `/api/documents/${docId}/stream?storageKey=${storageKey}`,
        {
          headers: getAuthHeaders(),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to download document");
      }

      // Get filename from content-disposition header or use a default
      const contentDisposition = response.headers.get("content-disposition");
      let filename = "document";
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Create blob from the stream
      const blob = await response.blob();

      // Create a download link and trigger it
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast.success("Document downloaded successfully");
    } catch (error) {
      console.error("Download error:", error);
      toast.error("Failed to download document");
    }
  };

  const DocumentActions = ({ doc }: { doc: Document }) => {
    return (
      <>
        {doc.isDownloading && (
          <Badge variant="secondary" className="gap-1">
            <Icons.spinner className="h-3 w-3 animate-spin" />
            <span>Saving to Knowledge Base</span>
          </Badge>
        )}

        {!doc.isDownloading && (
          <>
            {doc.content && (
              <Button
                size="sm"
                onClick={() => setViewingDocument(doc)}
                className="h-8 w-8 p-0"
                title="View content"
              >
                <Icons.file className="h-4 w-4" />
              </Button>
            )}
            {doc.storageKey && (
              <Button
                size="sm"
                onClick={() =>
                  downloadFileToDisk(doc.id as string, doc.storageKey!)
                }
                className="h-8 w-8 p-0"
                title="Download document"
              >
                <Icons.download className="h-4 w-4" />
              </Button>
            )}
          </>
        )}
      </>
    );
  };

  const groupDocuments = (integrationGroups: IntegrationGroup[]) => {
    const documentMap: DocumentMap = {};

    integrationGroups.forEach((group) => {
      // Create a lookup of all documents in this group
      const documentLookup = group.documents.reduce((acc, doc) => {
        acc[doc.id] = doc;
        return acc;
      }, {} as { [key: string]: Document });

      // Initialize the connection's document map
      documentMap[group.connectionId] = {
        root: [],
      };

      // Group documents by parent
      group.documents.forEach((doc) => {
        if (doc.parentId && documentLookup[doc.parentId]) {
          if (!documentMap[group.connectionId][doc.parentId]) {
            documentMap[group.connectionId][doc.parentId] = [];
          }
          documentMap[group.connectionId][doc.parentId].push(doc);
        } else {
          // If no valid parentId, add to root
          documentMap[group.connectionId].root.push(doc);
        }
      });
    });

    return documentMap;
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
      const groupedDocs = groupDocuments(groups);

      console.log({ groupedDocs, groups });

      setDocumentMap(groupedDocs);
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

  const getCurrentDocuments = (integrationId: string): Document[] => {
    // Find the integration group that matches this ID
    const integration = integrationGroups.find(
      (group) => group.integrationId === integrationId
    );
    if (!integration) return [];

    // Find the connection ID for this integration
    const connectionId = integration.connectionId;
    if (!connectionId || !documentMap[connectionId]) return [];

    // If no folder is selected, return root documents
    if (currentFolderId === null) {
      return documentMap[connectionId].root || [];
    }

    // Return documents for the current folder
    return documentMap[connectionId][currentFolderId] || [];
  };

  // Update initial fetch to show loading state
  useEffect(() => {
    fetchSubscribedDocuments(true);
  }, []);

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
      <div className="flex items-center flex-wrap gap-2 mb-4 text-sm text-gray-500">
        <button
          onClick={() => navigateToBreadcrumb(-1)}
          className="hover:text-gray-900 transition-colors"
        >
          All Documents
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
      <h1 className="text-2xl font-bold mb-6">Knowledge Base</h1>
      {renderBreadcrumbs()}

      <div className="space-y-8">
        {integrationGroups.map((integration) => {
          const currentDocs = getCurrentDocuments(integration.integrationId);
          const folders = currentDocs.filter((doc) => doc.canHaveChildren);
          const files = currentDocs.filter((doc) => !doc.canHaveChildren);

          if (currentDocs.length === 0) return null;

          return (
            <Card key={integration.integrationId}>
              <CardHeader>
                <div className="flex items-center gap-3">
                  {integration.integrationLogo ? (
                    <img
                      src={integration.integrationLogo}
                      alt={`${integration.integrationName} logo`}
                      className="w-8 h-8 rounded-lg"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      {integration.integrationName[0]}
                    </div>
                  )}
                  <CardTitle>{integration.integrationName}</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {folders.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                      onClick={() => navigateToFolder(doc.id, doc.title)}
                    >
                      <Icons.folder className="h-4 w-4 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {doc.title}
                          </p>
                          <span className="text-xs text-gray-400">
                            {doc.id}
                          </span>
                        </div>
                        {doc.updatedAt && (
                          <p className="text-xs text-gray-500">
                            Updated{" "}
                            {format(new Date(doc.updatedAt), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                      <Icons.chevronRight className="h-4 w-4 text-gray-400" />
                    </div>
                  ))}

                  {files.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-md"
                    >
                      <Icons.file className="h-4 w-4 text-gray-400" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {doc.title}
                          </p>
                          <span className="text-xs text-gray-400">
                            {doc.id}
                          </span>
                        </div>
                        {doc.updatedAt && (
                          <p className="text-xs text-gray-500">
                            Updated{" "}
                            {format(new Date(doc.updatedAt), "MMM d, yyyy")}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <DocumentActions doc={doc} />
                        {doc.resourceURI && (
                          <a
                            href={doc.resourceURI}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-600 h-8 w-8 flex items-center justify-center"
                            title="Open preview"
                          >
                            <Icons.externalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {viewingDocument && (
        <DocumentViewer
          documentId={viewingDocument.id}
          title={viewingDocument.title}
          open={!!viewingDocument}
          onOpenChange={(open) => !open && setViewingDocument(null)}
        />
      )}
    </div>
  );
}
