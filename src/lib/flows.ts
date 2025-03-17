import { DocumentModel } from "@/models/document";
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

  if (doc.isDownloading) {
    return false;
  }

  await DocumentModel.updateOne(
    { id: documentId },
    { $set: { isDownloading: true } }
  );

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
  } catch (error) {
    await DocumentModel.updateOne(
      { id: documentId },
      { $set: { isDownloading: false } }
    );

    throw error;
  }

  return runResult;
}
