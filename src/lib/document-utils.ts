import { DocumentModel } from "@/models/document";

/**
 * Recursively fetches all document IDs in a hierarchy starting from a root document
 * @param documentId - The ID of the root document
 * @returns Array of document IDs including the root and all its descendants
 */
export async function getAllDocumentIds(documentId: string): Promise<string[]> {
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
    children.map((child) => getAllDocumentIds(child.id))
  );

  return [documentId, ...childrenIds.flat()];
}
