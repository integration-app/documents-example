import { useState, useMemo } from "react";
import { Document } from "@/models/document";

interface BreadcrumbItem {
  id: string;
  title: string;
}

interface UseDocumentNavigationReturn {
  currentFolders: Document[];
  currentFiles: Document[];
  breadcrumbs: BreadcrumbItem[];
  currentFolderId: string | null;
  navigateToFolder: (folderId: string, folderTitle: string) => void;
  navigateToBreadcrumb: (index: number) => void;
}

export function useDocumentNavigation(
  documents: Document[],
  searchQuery: string = ""
): UseDocumentNavigationReturn {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([]);

  // Filter documents based on search query
  const filteredDocuments = useMemo(() => {
    if (!searchQuery) return documents;

    const searchLower = searchQuery.toLowerCase();
    return documents.filter((doc) =>
      doc.title.toLowerCase().includes(searchLower)
    );
  }, [documents, searchQuery]);

  // Get current folders
  const currentFolders = useMemo(() => {
    return filteredDocuments.filter((doc) => {
      if (currentFolderId === null) {
        return doc.canHaveChildren && !doc.parentId;
      }
      return doc.canHaveChildren && doc.parentId === currentFolderId;
    });
  }, [filteredDocuments, currentFolderId]);

  // Get current files
  const currentFiles = useMemo(() => {
    return filteredDocuments.filter((doc) => {
      if (currentFolderId === null) {
        return doc.canHaveChildren === false && !doc.parentId;
      }
      return doc.canHaveChildren === false && doc.parentId === currentFolderId;
    });
  }, [filteredDocuments, currentFolderId]);

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

  return {
    currentFolders,
    currentFiles,
    breadcrumbs,
    currentFolderId,
    navigateToFolder,
    navigateToBreadcrumb,
  };
}
