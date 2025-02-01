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
  documentId: string
): Promise<boolean> {
  let currentDoc = await DocumentModel.findOne({ id: documentId });

  if (currentDoc?.isSubscribed) {
    return true;
  }

  while (currentDoc?.parentId) {
    currentDoc = await DocumentModel.findOne({ id: currentDoc.parentId });

    if (currentDoc?.isSubscribed) {
      console.log("Found parent subscription:", currentDoc);
      return true;
    }
  }

  return false;
}