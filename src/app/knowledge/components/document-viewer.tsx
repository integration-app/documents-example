import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/app/auth-provider";
import { Loader2Icon } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";

interface DocumentViewerProps {
  documentId: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentViewer({
  documentId,
  title,
  open,
  onOpenChange,
}: DocumentViewerProps) {
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      if (!open) return;

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
  }, [open, documentId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto flex">
          {loading ? (
            <div className="flex-1 flex justify-center py-8">
              <Loader2Icon className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="flex-1 p-4 text-red-500 bg-red-50 rounded-md">{error}</div>
          ) : !content.trim() ? (
            <div className="flex-1 flex items-center justify-center text-gray-500 text-center">
              No content available for this document
            </div>
          ) : (
            <div className="flex-1 prose max-w-none dark:prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
