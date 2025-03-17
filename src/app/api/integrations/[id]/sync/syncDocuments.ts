import { inngest } from "@/inngest/client";
import { IntegrationAppClient } from "@integration-app/sdk";
import { DocumentModel, Document } from "@/models/document";
import { KnowledgeModel } from "@/models/knowledge";
import connectDB from "@/lib/mongodb";
import { NonRetriableError } from "inngest";

interface ListDocumentsActionRecord {
  fields: Exclude<Document, "connectionId" | "content" | "userId">;
}

interface SyncEventData {
  connectionId: string;
  integrationId: string;
  integrationName: string;
  integrationLogo?: string;
  userId: string;
  token: string;
}

interface DocumentsResponse {
  output: {
    records: ListDocumentsActionRecord[];
    cursor?: string;
  };
}

// Custom error class for timeout
class TimeoutError extends Error {
  constructor(operation: string) {
    super(`Operation "${operation}" timed out`);
    this.name = "TimeoutError";
  }
}

// Helper function to check if error is a connection not found error
function isConnectionNotFoundError(
  error: unknown,
  connectionId: string
): boolean {
  return (
    error instanceof Error &&
    error.message.includes(`Connection "${connectionId}" not found`)
  );
}

/**
 * Wraps a promise with a timeout
 * @param promise The promise to wrap with a timeout
 * @param timeoutMs Timeout duration in milliseconds
 * @param operationName Name of the operation for error messaging
 * @returns Promise that rejects with TimeoutError if the timeout is reached
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new TimeoutError(operationName));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

export const inngest_syncDocuments = inngest.createFunction(
  {
    id: "sync-documents",
    retries: 3,
  },
  { event: "integration/sync-documents" },
  async ({ event, step, logger }) => {
    const { connectionId, userId, token } = event.data as SyncEventData;
    const FETCH_TIMEOUT = 30000; // 30 seconds timeout
    const MAX_DOCUMENTS = 1000; // Maximum number of documents to sync
    let totalDocumentsSynced = 0;

    try {
      await connectDB();

      // Clear existing documents
      await step.run("clear-existing-documents", async () => {
        await DocumentModel.deleteMany({ connectionId });
      });

      const integrationApp = new IntegrationAppClient({ token });
      let cursor: string | undefined;

      // Sync all documents in batches
      while (true) {
        logger.info("Fetching documents batch");
        const result = await step.run(`fetch-documents-batch`, async () => {
          try {
            const fetchPromise = integrationApp
              .connection(connectionId)
              .action("list-documents")
              .run({ cursor }) as Promise<DocumentsResponse>;

            return await withTimeout(
              fetchPromise,
              FETCH_TIMEOUT,
              "Document fetch operation"
            );
          } catch (error) {
            // Check if the error is due to connection not found
            if (isConnectionNotFoundError(error, connectionId)) {
              throw new NonRetriableError(
                `Connection "${connectionId}" was archived during sync process`
              );
            }

            throw error;
          }
        });

        const records = result.output.records as ListDocumentsActionRecord[];

        const docsToSave = records.map((doc) => ({
          ...doc.fields,
          connectionId,
          isSubscribed: false,
          content: null,
          userId,
        }));

        // Check if adding these documents would exceed our limit
        if (totalDocumentsSynced + docsToSave.length > MAX_DOCUMENTS) {
          // Only take the number of documents that would get us to MAX_DOCUMENTS
          const remainingSlots = MAX_DOCUMENTS - totalDocumentsSynced;
          docsToSave.splice(remainingSlots);
        }

        if (docsToSave.length) {
          await step.run(`save-documents-batch`, async () => {
            return await DocumentModel.bulkWrite(
              docsToSave.map((doc) => ({
                updateOne: {
                  filter: { id: doc.id, connectionId },
                  update: { $set: doc },
                  upsert: true,
                },
              }))
            );
          });

          totalDocumentsSynced += docsToSave.length;
        }

        // Break if we've reached the maximum number of documents
        if (totalDocumentsSynced >= MAX_DOCUMENTS) {
          break;
        }

        // Only continue if there's more data to fetch
        cursor = result.output.cursor;
        if (!cursor) break;
      }

      // Update final sync status
      await step.run("complete-sync", async () => {
        // Wait for a bit before marking sync as completed so that the UI can update sync count
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // First check if knowledge still exists
        const existingKnowledge = await KnowledgeModel.findOne({
          connectionId,
        });

        if (!existingKnowledge) {
          throw new NonRetriableError(
            `Knowledge for connection "${connectionId}" not found`
          );
        }

        // If knowledge exists, proceed with normal sync completion
        const knowledge = await KnowledgeModel.findOneAndUpdate(
          { connectionId },
          {
            $set: {
              syncStatus: "completed",
              syncCompletedAt: new Date(),
              syncError: null,
            },
          },
          { new: true }
        );

        return knowledge;
      });

      return { success: true, totalDocumentsSynced };
    } catch (error) {
      // Update sync status to failed for other errors
      await step.run("handle-sync-error", async () => {
        // First check if knowledge exists
        const existingKnowledge = await KnowledgeModel.findOne({
          connectionId,
        });

        if (!existingKnowledge) {
          // If knowledge doesn't exist, delete all associated documents
          await DocumentModel.deleteMany({ connectionId });

          return {
            cleanupDueToError: true,
          };
        }

        await KnowledgeModel.findOneAndUpdate(
          { connectionId },
          {
            $set: {
              syncStatus: "failed",
              syncCompletedAt: new Date(),
              syncError:
                error instanceof Error
                  ? error.message
                  : "Unknown error occurred",
              totalDocuments: totalDocumentsSynced,
            },
          },
          { new: true }
        );
      });

      throw error; // Re-throw the error to mark the function as failed
    }
  }
);
