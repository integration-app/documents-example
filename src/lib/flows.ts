import { IntegrationAppClient } from "@integration-app/sdk";

export async function triggerDownloadDocumentFlow(
  token: string,
  connectionId: string,
  documentId: string
) {
  const integrationApp = new IntegrationAppClient({ token });

  return await integrationApp
    .connection(connectionId)
    .flow("download-document")
    .run({
      input: {
        documentId,
      },
    });
}
