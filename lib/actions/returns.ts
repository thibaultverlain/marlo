"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/require-role";
import { createReturn, resolveReturn } from "@/lib/db/queries/returns";

const returnSchema = z.object({
  saleId: z.string().uuid("Vente invalide"),
  productId: z.string().uuid().optional().nullable(),
  reason: z.string().min(1, "Raison requise"),
  refundAmount: z.string().optional().nullable(),
  restockProduct: z.string().optional(),
  notes: z.string().optional().nullable(),
});

export async function createReturnAction(formData: FormData) {
  const ctx = await getAuthContext();
  const parsed = returnSchema.safeParse({
    saleId: formData.get("saleId"),
    productId: formData.get("productId"),
    reason: formData.get("reason"),
    refundAmount: formData.get("refundAmount"),
    restockProduct: formData.get("restockProduct"),
    notes: formData.get("notes"),
  });

  if (!parsed.success) return { error: parsed.error.issues[0].message };

  try {
    await createReturn({
      shopId: ctx.shopId,
      saleId: parsed.data.saleId,
      productId: parsed.data.productId && parsed.data.productId.length > 0 ? parsed.data.productId : null,
      reason: parsed.data.reason,
      refundAmount: parsed.data.refundAmount || null,
      restockProduct: parsed.data.restockProduct === "true",
      notes: parsed.data.notes || null,
    });
    revalidatePath("/returns");
    revalidatePath("/sales");
    revalidatePath("/orders");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function resolveReturnAction(returnId: string, status: "rembourse" | "refuse", refundAmount?: string) {
  const ctx = await getAuthContext();
  try {
    await resolveReturn(returnId, ctx.shopId, status, refundAmount);
    revalidatePath("/returns");
    revalidatePath("/sales");
    revalidatePath("/products");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
