"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext, canAccess } from "@/lib/auth/require-role";
import { createTemplate, updateTemplate, deleteTemplate } from "@/lib/db/queries/templates";

const templateSchema = z.object({
  type: z.enum(["annonce", "message", "email", "description"]),
  name: z.string().min(1, "Nom requis"),
  content: z.string().min(1, "Contenu requis"),
  variables: z.string().optional().nullable(),
});

export async function createTemplateAction(formData: FormData) {
  const ctx = await getAuthContext();
  if (ctx.role !== "owner") return { error: "Seul le proprietaire peut creer des templates" };

  const parsed = templateSchema.safeParse({
    type: formData.get("type"),
    name: formData.get("name"),
    content: formData.get("content"),
    variables: formData.get("variables"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await createTemplate({
      shopId: ctx.shopId,
      createdBy: ctx.userId,
      type: parsed.data.type,
      name: parsed.data.name,
      content: parsed.data.content,
      variables: parsed.data.variables || null,
    });
    revalidatePath("/templates");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function updateTemplateAction(id: string, formData: FormData) {
  const ctx = await getAuthContext();
  if (ctx.role !== "owner") return { error: "Seul le proprietaire peut modifier des templates" };

  const parsed = templateSchema.safeParse({
    type: formData.get("type"),
    name: formData.get("name"),
    content: formData.get("content"),
    variables: formData.get("variables"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await updateTemplate(id, ctx.shopId, {
      type: parsed.data.type,
      name: parsed.data.name,
      content: parsed.data.content,
      variables: parsed.data.variables || null,
    });
    revalidatePath("/templates");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function deleteTemplateAction(id: string) {
  const ctx = await getAuthContext();
  if (ctx.role !== "owner") return { error: "Seul le proprietaire peut supprimer des templates" };

  try {
    await deleteTemplate(id, ctx.shopId);
    revalidatePath("/templates");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
