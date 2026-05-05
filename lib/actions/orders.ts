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
