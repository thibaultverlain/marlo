"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/require-role";
import { createAuthCheck, deleteAuthCheck } from "@/lib/db/queries/authentification";

export type SaveCheckPayload = {
  productId?: string;
  brand: string;
  model?: string;
  points: Array<{ id: string; checked: boolean }>;
  verdict: "authentique" | "suspect" | "faux" | "non_conclu";
  notes?: string;
};

export async function saveAuthCheckAction(payload: SaveCheckPayload) {
  const ctx = await getAuthContext();
  try {
    const check = await createAuthCheck({
      userId: ctx.userId,
      shopId: ctx.shopId,
      productId: payload.productId || null,
      brand: payload.brand,
      model: payload.model || null,
      points: payload.points,
      verdict: payload.verdict,
      notes: payload.notes || null,
    });
    revalidatePath("/authentification");
    if (payload.productId) revalidatePath(`/products/${payload.productId}`);
    return { success: true, id: check.id };
  } catch (e: any) {
    return { error: e.message || "Erreur lors de la sauvegarde" };
  }
}

export async function deleteAuthCheckAction(checkId: string) {
  const ctx = await getAuthContext();
  try {
    await deleteAuthCheck(checkId, ctx.shopId);
    revalidatePath("/authentification");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
