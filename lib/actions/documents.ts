"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { createDocument, deleteDocument } from "@/lib/db/queries/documents";

export async function addDocumentAction(data: {
  category: string;
  name: string;
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  expiresAt?: string;
}) {
  const ctx = await requireRole("owner");

  try {
    await createDocument({
      shopId: ctx.shopId,
      uploadedBy: ctx.userId,
      category: data.category,
      name: data.name,
      fileName: data.fileName,
      fileUrl: data.fileUrl,
      fileSize: data.fileSize || null,
      mimeType: data.mimeType || null,
      expiresAt: data.expiresAt || null,
    });
    revalidatePath("/admin/documents");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function deleteDocumentAction(id: string) {
  const ctx = await requireRole("owner");

  try {
    await deleteDocument(id, ctx.shopId);
    revalidatePath("/admin/documents");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
