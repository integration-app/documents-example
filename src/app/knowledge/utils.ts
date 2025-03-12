import { toast } from "sonner";
import { getAuthHeaders } from "@/app/auth-provider";
import { Document } from "@/models/document";

export interface IntegrationGroup {
  connectionId: string;
  integrationId: string;
  integrationName: string;
  integrationLogo: string;
  documents: Document[];
}

/**
 * Filters integration groups based on the selected integration ID
 * @param groups - Array of integration groups to filter
 * @param selectedId - The ID of the selected integration to filter by
 * @returns Filtered array of integration groups
 */
export const filterIntegrationGroups = (
  groups: IntegrationGroup[],
  selectedId: string | null
): IntegrationGroup[] => {
  if (!selectedId) {
    return groups;
  }
  return groups.filter((group) => group.integrationId === selectedId);
};

/**
 * Downloads a file to disk using the document's ID and storage key
 * @param docId - The ID of the document to download
 * @param storageKey - The storage key of the document
 */
export const downloadFileToDisk = async (docId: string, storageKey: string) => {
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

    const contentDisposition = response.headers.get("content-disposition");
    let filename = "document";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();

    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);

    toast.success("Document downloaded successfully");
  } catch (error) {
    console.error("Download error:", error);
    toast.error("Failed to download document");
  }
};
