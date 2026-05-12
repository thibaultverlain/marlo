"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/require-role";
import { createPayout, updatePayout, deletePayout, linkSaleToPayout, unlinkSaleFromPayout } from "@/lib/db/queries/payouts";

const payoutSchema = z.object({
  platform: z.string().min(1, "Plateforme requise"),
  expectedAmount: z.string().min(1, "Montant requis"),
  expectedDate: z.string().optional().nullable(),
  reference: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function createPayoutAction(formData: FormData) {
  const ctx = await getAuthContext();
  const parsed = payoutSchema.safeParse({
    platform: formData.get("platform"),
    expectedAmount: formData.get("expectedAmount"),
    expectedDate: formData.get("expectedDate"),
    reference: formData.get("reference"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await createPayout({
      shopId: ctx.shopId,
      platform: parsed.data.platform,
      expectedAmount: parsed.data.expectedAmount,
      expectedDate: parsed.data.expectedDate || null,
      reference: parsed.data.reference || null,
      notes: parsed.data.notes || null,
    });
    revalidatePath("/payouts");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function markPayoutReceivedAction(payoutId: string, receivedAmount: string, receivedDate: string) {
  const ctx = await getAuthContext();
  try {
    await updatePayout(payoutId, ctx.shopId, {
      receivedAmount,
      receivedDate: receivedDate || new Date().toISOString().split("T")[0],
      status: "recu",
    });
    revalidatePath("/payouts");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function deletePayoutAction(payoutId: string) {
  const ctx = await getAuthContext();
  try {
    await deletePayout(payoutId, ctx.shopId);
    revalidatePath("/payouts");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function linkSaleAction(payoutId: string, saleId: string) {
  await getAuthContext();
  try {
    await linkSaleToPayout(payoutId, saleId);
    revalidatePath("/payouts");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
