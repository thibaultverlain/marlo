"use server";
import { getAuthContext } from "@/lib/auth/require-role";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  createMission,
  updateMission,
  deleteMission,
  createPsItem,
  deletePsItem,
} from "@/lib/db/queries/personal-shopping";

const missionSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  eventDate: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

function cleanNum(s: string | null | undefined): string {
  if (!s || s.trim() === "") return "0";
  return s.replace(/[€%\s]/g, "").replace(",", ".").trim() || "0";
}

const itemSchema = z.object({
  missionId: z.string().uuid(),
  customerId: z.string().uuid("Client requis"),
  description: z.string().min(1, "Description requise"),
  brand: z.string().optional().nullable(),
  purchasePrice: z.string().refine((s) => !isNaN(parseFloat(cleanNum(s))), "Prix invalide").transform(cleanNum),
  commissionRate: z.string().transform(cleanNum).optional().or(z.literal("")),
  notes: z.string().optional().nullable(),
});

export async function createMissionAction(formData: FormData) {
  const raw = {
    name: formData.get("name") as string,
    eventDate: formData.get("eventDate") as string,
    location: formData.get("location") as string,
    notes: formData.get("notes") as string,
  };

  const parsed = missionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  let missionId: string | undefined;
  try {
    const ctx = await getAuthContext();
    const mission = await createMission({ userId: ctx.userId, shopId: ctx.shopId,
      name: parsed.data.name,
      eventDate: parsed.data.eventDate || null,
      location: parsed.data.location || null,
      notes: parsed.data.notes || null,
      status: "planifie",
    });
    missionId = mission.id;
  } catch (err) {
    console.error("createMissionAction:", err);
    return { error: "Erreur lors de la création." };
  }

  revalidatePath("/personal-shopping");
  redirect(`/personal-shopping/${missionId}`);
}

export async function updateMissionStatusAction(id: string, newStatus: string) {
  try {
    await updateMission(id, { status: newStatus as any });
    revalidatePath("/personal-shopping");
    revalidatePath(`/personal-shopping/${id}`);
    return { success: true };
  } catch (err) {
    console.error("updateMissionStatusAction:", err);
    return { error: "Erreur." };
  }
}

export async function deleteMissionAction(id: string) {
  try {
    const ctx = await getAuthContext();
    await deleteMission(id, ctx.shopId);
  } catch (err) {
    console.error("deleteMissionAction:", err);
    return { error: "Erreur lors de la suppression." };
  }
  revalidatePath("/personal-shopping");
  redirect("/personal-shopping");
}

export async function addPsItemAction(formData: FormData) {
  const raw = {
    missionId: formData.get("missionId") as string,
    customerId: formData.get("customerId") as string,
    description: formData.get("description") as string,
    brand: formData.get("brand") as string,
    purchasePrice: formData.get("purchasePrice") as string,
    commissionRate: formData.get("commissionRate") as string,
    notes: formData.get("notes") as string,
  };

  const parsed = itemSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Données invalides" };
  }

  try {
    const rate = parsed.data.commissionRate
      ? parseFloat(parsed.data.commissionRate) / 100
      : 0;
    const purchasePrice = parseFloat(parsed.data.purchasePrice);
    const commissionAmount = purchasePrice * rate;

    const ctx = await getAuthContext();
    await createPsItem({ userId: ctx.userId, shopId: ctx.shopId,
      missionId: parsed.data.missionId,
      customerId: parsed.data.customerId,
      description: parsed.data.description,
      brand: parsed.data.brand || null,
      purchasePrice: parsed.data.purchasePrice,
      commissionRate: rate > 0 ? String(rate) : null,
      commissionAmount: commissionAmount > 0 ? String(commissionAmount) : null,
      notes: parsed.data.notes || null,
      invoiced: false,
    });
  } catch (err) {
    console.error("addPsItemAction:", err);
    return { error: "Erreur lors de l'ajout." };
  }

  revalidatePath(`/personal-shopping/${raw.missionId}`);
  revalidatePath("/personal-shopping");
  return { success: true };
}

export async function deletePsItemAction(itemId: string, missionId: string) {
  try {
    await deletePsItem(itemId);
    revalidatePath(`/personal-shopping/${missionId}`);
    return { success: true };
  } catch (err) {
    console.error("deletePsItemAction:", err);
    return { error: "Erreur." };
  }
}
