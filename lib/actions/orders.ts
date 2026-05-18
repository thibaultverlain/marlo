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
