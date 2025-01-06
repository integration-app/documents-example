import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { getAuthHeaders } from "@/app/auth-provider";
import { Loader2Icon } from "lucide-react";

interface DocumentViewerProps {
  documentId: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DocumentViewer({ documentId, title, open, onOpenChange }: DocumentViewerProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && documentId) {
      fetchContent();
    }
  }, [open, documentId]);

  const fetchContent = async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}/content`, {
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        throw new Error('Failed to fetch document content');
      }

      const data = await response.json();
      setContent(data.content);
    } catch (error) {
      console.error('Error fetching content:', error);
      setError('Failed to load document content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2Icon className="h-8 w-8 animate-spin" />
            </div>
          ) : error ? (
            <div className="p-4 text-red-500 bg-red-50 rounded-md">
              {error}
            </div>
          ) : (
            <div className="prose max-w-none dark:prose-invert">
              <pre className="whitespace-pre-wrap">{content}</pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
} 