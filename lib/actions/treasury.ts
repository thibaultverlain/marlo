"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/require-role";
import {
  updateCashBalance,
  createPendingPayout,
  deletePendingPayout,
  markPayoutReceived,
} from "@/lib/db/queries/treasury";

const cashSchema = z.object({
  amount: z.coerce.number().min(0, "Montant invalide").max(10000000, "Montant trop grand"),
});

export async function updateCashBalanceAction(formData: FormData) {
  const ctx = await getAuthContext();
  const parsed = cashSchema.safeParse({ amount: formData.get("amount") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Montant invalide" };
  }
  try {
    await updateCashBalance(ctx.shopId, parsed.data.amount);
    revalidatePath("/accounting");
    return { success: true };
  } catch (err: any) {
    return { error: err.message ?? "Erreur de mise a jour" };
  }
}

const payoutSchema = z.object({
  label: z.string().min(1, "Nom requis"),
  amount: z.coerce.number().positive("Montant invalide"),
  platform: z.string().min(1, "Plateforme requise"),
  notes: z.string().optional().nullable(),
});

export async function createPendingPayoutAction(formData: FormData) {
  const ctx = await getAuthContext();
  const parsed = payoutSchema.safeParse({
    label: formData.get("label"),
    amount: formData.get("amount"),
    platform: formData.get("platform"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides" };
  }
  try {
    await createPendingPayout({
      shopId: ctx.shopId,
      label: parsed.data.label,
      amount: String(parsed.data.amount),
      platform: parsed.data.platform,
      notes: parsed.data.notes || null,
    });
    revalidatePath("/accounting");
    return { success: true };
  } catch (err: any) {
    return { error: err.message ?? "Erreur lors de l'ajout" };
  }
}

export async function deletePendingPayoutAction(id: string) {
  const ctx = await getAuthContext();
  try {
    await deletePendingPayout(id, ctx.shopId);
    revalidatePath("/accounting");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}

export async function markPayoutReceivedAction(id: string) {
  const ctx = await getAuthContext();
  try {
    await markPayoutReceived(id, ctx.shopId);
    revalidatePath("/accounting");
    return { success: true };
  } catch (err: any) {
    return { error: err.message };
  }
}
