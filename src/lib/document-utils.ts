import { DocumentModel } from "@/models/document";

/**
 * Recursively fetches all document IDs in a hierarchy starting from a root document
 * @param documentId - The ID of the root document
 * @returns Array of document IDs including the root and all its descendants
 */
export async function getDocumentHierarchyIds(
  documentId: string
): Promise<string[]> {
  // Get the root document
  const rootDoc = await DocumentModel.findById(documentId);
  if (!rootDoc) {
    return [];
  }

  if (!rootDoc.canHaveChildren) {
    return [documentId];
  }

  const children = await DocumentModel.find({ parentId: documentId });

  // Recursively get IDs for all children
  const childrenIds = await Promise.all(
    children.map((child) => getDocumentHierarchyIds(child.id))
  );

  return [documentId, ...childrenIds.flat()];
}

/**
 * Recursively checks if any parent document in the hierarchy is subscribed
 * @param documentId - The ID of the document to start checking from
 * @returns Promise<boolean> - Returns true if any parent document is subscribed, false otherwise
 */
export async function findParentSubscription(
  parentDocumentId: string
): Promise<boolean> {
  let document = await DocumentModel.findOne({ id: parentDocumentId });

  if (!document) {
    return false;
  }

  if (document.isSubscribed) {
    return true;
  }

  while (document?.parentId) {
    document = await DocumentModel.findOne({ id: document.parentId });

    if (document?.isSubscribed) {
      return true;
    }
  }

  return false;
}