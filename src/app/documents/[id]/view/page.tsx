"use client";

import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/app/auth-provider";
import { Loader2Icon } from "lucide-react";
import { use } from 'react'

type Params = Promise<{
  id: string;
}>;

export default function ViewDocument({ params }: { params: Params }) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { id: documentId } = use(params)

  useEffect(() => {
    const fetchContent = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}/content`, {
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error("Failed to fetch document content");
        }

        const data = await response.json();
        setContent(data.content);
      } catch (error) {
        console.error("Error fetching content:", error);
        setError("Failed to load document content");
      } finally {
        setLoading(false);
      }
    };

    fetchContent();
  }, [documentId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2Icon className="h-8 w-8 animate-spin" />
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

  return (
    <div className="container mx-auto py-8">
      <div className="prose max-w-none">
        <pre className="whitespace-pre-wrap">{content}</pre>
      </div>
    </div>
  );
}
