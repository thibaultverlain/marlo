"use server";
import { getAuthContext } from "@/lib/auth/require-role";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createSourcingRequest,
  updateSourcingRequest,
  deleteSourcingRequest,
  getSourcingById,
} from "@/lib/db/queries/sourcing";

function cleanNum(s: string | null | undefined): string {
  if (!s || s.trim() === "") return "0";
  return s.replace(/[€%\s]/g, "").replace(",", ".").trim() || "0";
}

const sourcingSchema = z.object({
  customerId: z.string().uuid("Client requis"),
  description: z.string().min(1, "Description requise"),
  brand: z.string().optional().nullable(),
  model: z.string().optional().nullable(),
  targetBudget: z.string().transform(cleanNum).optional().or(z.literal("")),
  commissionRate: z.string().transform(cleanNum).optional().or(z.literal("")),
  deadline: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function createSourcingAction(formData: FormData) {
  const raw = {
    customerId: formData.get("customerId") as string,
    description: formData.get("description") as string,
    brand: formData.get("brand") as string,
    model: formData.get("model") as string,
    targetBudget: formData.get("targetBudget") as string,
    commissionRate: formData.get("commissionRate") as string,
    deadline: formData.get("deadline") as string,
    notes: formData.get("notes") as string,
  };

  const parsed = sourcingSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  try {
    // commissionRate entré en % (ex: 15) converti en décimal (0.15)
    const rate = parsed.data.commissionRate
      ? String(parseFloat(parsed.data.commissionRate) / 100)
      : null;

    const ctx = await getAuthContext();
    await createSourcingRequest({ userId: ctx.userId, shopId: ctx.shopId,
      customerId: parsed.data.customerId,
      description: parsed.data.description,
      brand: parsed.data.brand || null,
      model: parsed.data.model || null,
      targetBudget: parsed.data.targetBudget || null,
      commissionRate: rate,
      deadline: parsed.data.deadline || null,
      notes: parsed.data.notes || null,
      status: "ouvert",
    });
  } catch (err) {
    console.error("createSourcingAction:", err);
    return { error: "Erreur lors de la création." };
  }

  revalidatePath("/sourcing");
  revalidatePath("/dashboard");
  redirect("/sourcing");
}

export async function updateSourcingStatusAction(id: string, newStatus: string) {
  try {
    await updateSourcingRequest(id, { status: newStatus as any });
    revalidatePath("/sourcing");
    revalidatePath(`/sourcing/${id}`);
    return { success: true };
  } catch (err) {
    console.error("updateSourcingStatusAction:", err);
    return { error: "Erreur." };
  }
}

export async function linkProductToSourcingAction(
  sourcingId: string,
  productId: string,
  purchasePrice: number,
  salePrice: number
) {
  try {
    const sourcing = await getSourcingById(sourcingId);
    if (!sourcing) return { error: "Demande introuvable" };

    const commissionRate = Number(sourcing.commissionRate ?? 0);
    const commissionAmount = salePrice * commissionRate;

    await updateSourcingRequest(sourcingId, {
      foundProductId: productId,
      purchasePrice: String(purchasePrice),
      salePrice: String(salePrice),
      commissionAmount: String(commissionAmount),
      status: "trouve",
    });

    revalidatePath("/sourcing");
    revalidatePath(`/sourcing/${sourcingId}`);
    return { success: true, commissionAmount };
  } catch (err) {
    console.error("linkProductToSourcingAction:", err);
    return { error: "Erreur." };
  }
}

export async function deleteSourcingAction(id: string) {
  try {
    const ctx = await getAuthContext();
    await deleteSourcingRequest(id, ctx.shopId);
  } catch (err) {
    console.error("deleteSourcingAction:", err);
    return { error: "Erreur lors de la suppression." };
  }
  revalidatePath("/sourcing");
  revalidatePath("/dashboard");
  redirect("/sourcing");
}
