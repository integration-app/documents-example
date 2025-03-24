"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Document } from "@/models/document";
import { KnowledgeItem } from "@/app/knowledge/components/knowledge-item";
import { useDocumentNavigation } from "@/app/integrations/hooks/use-document-navigation";
import { ChevronRightIcon } from "lucide-react";
import Image from "next/image";

interface IntegrationCardProps {
  connectionId: string;
  integrationId: string;
  integrationName: string;
  integrationLogo: string;
  documents: Document[];
}

export function IntegrationCard({
  integrationName,
  integrationLogo,
  documents,
}: IntegrationCardProps) {
  const {
    currentFolders: folders,
    currentFiles: files,
    breadcrumbs,
    navigateToFolder,
    navigateToBreadcrumb,
  } = useDocumentNavigation(documents);

  const renderBreadcrumbs = () => {
    return (
      <div className="flex items-center flex-wrap gap-2 mb-4 text-sm text-gray-500  bg-gray-100 p-2 -ml-6 -mr-6 pl-8">
        <button
          onClick={() => navigateToBreadcrumb(-1)}
          className="hover:text-gray-900 transition-colors"
        >
          All Documents
        </button>
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id} className="flex items-center gap-2">
            <ChevronRightIcon className="h-4 w-4 text-gray-400" />
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

  return (
    <>
      <Card className="shadow-none">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            {integrationLogo ? (
              <Image
                src={integrationLogo}
                alt={`${integrationName} logo`}
                width={32}
                height={32}
                className="rounded-lg"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                {integrationName[0]}
              </div>
            )}
            <div className="flex items-center gap-2">
              <CardTitle className="text-xl font-semibold text-gray-800">
                {integrationName}
              </CardTitle>
              <Badge variant="secondary" className="ml-1">
                {documents.length}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {renderBreadcrumbs()}
          <div className="space-y-2">
            {folders.length === 0 && files.length === 0 && (
              <div className="text-gray-500 text-sm p-4 w-full items-center flex justify-center">
                No files or folders
              </div>
            )}
            {folders.map((doc) => (
              <KnowledgeItem
                integrationName={integrationName}
                key={doc.id}
                document={doc}
                onItemClick={() => navigateToFolder(doc.id, doc.title)}
              />
            ))}

            {files.map((doc) => (
              <KnowledgeItem
                integrationName={integrationName}
                key={doc.id}
                document={doc}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
