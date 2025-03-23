import { DocumentModel } from "@/models/document";
import { DownloadState } from "@/types/download";
import { IntegrationAppClient } from "@integration-app/sdk";

export async function triggerDownloadDocumentFlow(
  token: string,
  connectionId: string,
  documentId: string
) {
  const integrationApp = new IntegrationAppClient({ token });

  const doc = await DocumentModel.findOne({ id: documentId });

  if (!doc) {
    throw new Error(`Document with id ${documentId} not found`);
  }

  // If the document is already downloading or extracting text, don't trigger the flow again
  if (
    doc.downloadState === DownloadState.DOWNLOADING_FROM_URL ||
    doc.downloadState === DownloadState.EXTRACTING_TEXT
  ) {
    return false;
  }

  let runResult;

  try {
    runResult = await integrationApp
      .connection(connectionId)
      .flow("download-document")
      .run({
        input: {
          documentId,
        },
      });

    await DocumentModel.updateOne(
      { id: documentId },
      { $set: { downloadState: DownloadState.FLOW_TRIGGERED } }
    );
  } catch (error) {
    console.error(
      `Failed to trigger flow for document ${documentId}: ${error}`
    );
    await DocumentModel.updateOne(
      { id: documentId },
      {
        $set: {
          downloadState: DownloadState.FAILED,
          downloadError: "Failed to trigger flow",
        },
      }
    );

    throw error;
  }

  return runResult;
}
