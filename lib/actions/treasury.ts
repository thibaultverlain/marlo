"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/require-role";
import { applyCashMovement, updateCashBalance } from "@/lib/db/queries/treasury";

const reconcileSchema = z.object({
  amount: z.coerce.number().min(-1000000).max(10000000),
  note: z.string().nullish(),
});

/**
 * Recale le solde Marlo sur le solde reel du compte bancaire.
 * L'ecart est trace comme un mouvement d'ajustement.
 */
export async function reconcileCashBalanceAction(formData: FormData) {
  const ctx = await getAuthContext();
  const parsed = reconcileSchema.safeParse({
    amount: formData.get("amount"),
    note: formData.get("note"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Montant invalide" };
  }
  try {
    await updateCashBalance(ctx.shopId, parsed.data.amount, parsed.data.note);
    revalidatePath("/accounting");
    return { success: true };
  } catch (err: any) {
    return { error: err.message ?? "Erreur lors du recalage" };
  }
}

const movementSchema = z.object({
  type: z.enum(["apport", "prelevement"]),
  amount: z.coerce.number().positive("Montant invalide").max(10000000, "Montant trop grand"),
  label: z.string().nullish(),
});

export async function createTreasuryMovementAction(formData: FormData) {
  const ctx = await getAuthContext();
  const parsed = movementSchema.safeParse({
    type: formData.get("type"),
    amount: formData.get("amount"),
    label: formData.get("label"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Donnees invalides" };
  }
  const signedAmount = parsed.data.type === "prelevement" ? -parsed.data.amount : parsed.data.amount;
  try {
    await applyCashMovement(ctx.shopId, parsed.data.type, signedAmount, parsed.data.label || null);
    revalidatePath("/accounting");
    return { success: true };
  } catch (err: any) {
    return { error: err.message ?? "Erreur lors de l'ajout du mouvement" };
  }
}
