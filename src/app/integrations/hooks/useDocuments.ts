import { getAuthHeaders } from "@/app/auth-provider";
import type { Document } from "@/models/document";
import useSWR from "swr";

type DocumentResponse = {
  documents: Document[];
};

export const useDocuments = (
  connectionId: string | undefined,
  isSyncing: boolean
) => {
  const { data, error, isLoading, mutate } = useSWR<Document[]>(
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
      refreshInterval: isSyncing ? 1500 : 0,
      revalidateOnFocus: false,
      onError: (err: Error) => {
        console.error("Error fetching documents:", err);
      },
    }
  );

  return {
    documents: data || [],
    setDocuments: (newDocuments: Document[]) => mutate(newDocuments, false),
    loading: isLoading,
    error: error?.message || null,
    fetchDocuments: () => mutate(),
  };
};
