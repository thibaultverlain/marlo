"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/require-role";
import { updateShippingStatus, updatePaymentStatus } from "@/lib/db/queries/orders";

export async function updateShippingStatusAction(saleId: string, status: string, trackingNumber?: string) {
  const ctx = await getAuthContext();
  try {
    await updateShippingStatus(saleId, ctx.shopId, status, trackingNumber);
    revalidatePath("/orders");
    revalidatePath("/sales");
    revalidatePath(`/sales/${saleId}`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function updatePaymentStatusAction(saleId: string, status: string) {
  const ctx = await getAuthContext();
  try {
    await updatePaymentStatus(saleId, ctx.shopId, status);
    revalidatePath("/orders");
    revalidatePath("/sales");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function updateTrackingAction(saleId: string, trackingNumber: string) {
  const ctx = await getAuthContext();
  try {
    await updateShippingStatus(saleId, ctx.shopId, "expedie", trackingNumber);
    revalidatePath("/orders");
    revalidatePath("/sales");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function bulkUpdateShippingAction(ids: string[], status: string) {
  if (!Array.isArray(ids) || ids.length === 0) {
    return { error: "Aucune commande selectionnee" };
  }
  if (!["expedie", "livre", "retourne"].includes(status)) {
    return { error: "Statut invalide" };
  }
  const ctx = await getAuthContext();
  try {
    await Promise.all(ids.map((id) => updateShippingStatus(id, ctx.shopId, status)));
    revalidatePath("/orders");
    revalidatePath("/sales");
    return { success: true, count: ids.length };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function declareReturnAction(saleId: string, restock: boolean) {
  const ctx = await getAuthContext();
  try {
    await updateShippingStatus(saleId, ctx.shopId, "retourne", undefined, restock);
    revalidatePath("/orders");
    revalidatePath("/sales");
    revalidatePath(`/sales/${saleId}`);
    revalidatePath("/products");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

import {
  updatePrepChecklist as dbUpdatePrep,
  setDispute as dbSetDispute,
  setShippingPhotos as dbSetPhotos,
  getOrderDetail,
} from "@/lib/db/queries/orders";

// ── Workflow traitement ──

const VALID_CHECKLIST_KEYS = new Set([
  "article_verifie",
  "photo_etat",
  "accessoires",
  "emballage",
  "mot_personnalise",
  "etiquette_imprimee",
]);

export async function togglePrepChecklistAction(saleId: string, key: string, checked: boolean) {
  if (!VALID_CHECKLIST_KEYS.has(key)) return { error: "Cle invalide" };
  const ctx = await getAuthContext();
  try {
    const order = await getOrderDetail(ctx.shopId, saleId);
    if (!order) return { error: "Commande introuvable" };
    const next = { ...(order.prepChecklist ?? {}), [key]: checked };
    await dbUpdatePrep(saleId, ctx.shopId, next);
    revalidatePath(`/orders/${saleId}`);
    revalidatePath("/orders");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

const VALID_DISPUTE_STATUSES = new Set(["ouvert", "rembourse", "resolu", "article_recupere"]);

export async function setDisputeAction(saleId: string, status: string | null, reason?: string) {
  if (status !== null && !VALID_DISPUTE_STATUSES.has(status)) return { error: "Statut invalide" };
  const ctx = await getAuthContext();
  try {
    await dbSetDispute(saleId, ctx.shopId, status, reason ?? null);
    revalidatePath(`/orders/${saleId}`);
    revalidatePath("/orders");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function updateShippingPhotosAction(saleId: string, photos: string[]) {
  const ctx = await getAuthContext();
  try {
    await dbSetPhotos(saleId, ctx.shopId, photos);
    revalidatePath(`/orders/${saleId}`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function updateOrderNotesAction(saleId: string, notes: string) {
  const ctx = await getAuthContext();
  try {
    const { db } = await import("@/lib/db/client");
    const { sales } = await import("@/lib/db/schema");
    const { eq, and } = await import("drizzle-orm");
    await db.update(sales).set({ notes }).where(and(eq(sales.id, saleId), eq(sales.shopId, ctx.shopId)));
    revalidatePath(`/orders/${saleId}`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
