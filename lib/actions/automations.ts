"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import {
  createAutomation,
  updateAutomation,
  deleteAutomation,
} from "@/lib/db/queries/automations";
import { logActivity } from "@/lib/db/queries/team";

const automationSchema = z.object({
  name: z.string().min(1, "Nom requis"),
  trigger: z.enum(["dormant_stock", "sale_recorded", "low_margin", "deadline_passed"]),
  triggerValue: z.string().optional().nullable(),
  action: z.enum(["create_task", "notify_owner", "notify_team"]),
  actionValue: z.string().optional().nullable(),
});

export async function createAutomationAction(formData: FormData) {
  const ctx = await requireRole("owner");
  const parsed = automationSchema.safeParse({
    name: formData.get("name"),
    trigger: formData.get("trigger"),
    triggerValue: formData.get("triggerValue"),
    action: formData.get("action"),
    actionValue: formData.get("actionValue"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const auto = await createAutomation({
      shopId: ctx.shopId,
      createdBy: ctx.userId,
      name: parsed.data.name,
      trigger: parsed.data.trigger,
      triggerValue: parsed.data.triggerValue || null,
      action: parsed.data.action,
      actionValue: parsed.data.actionValue || null,
    });

    await logActivity(ctx.shopId, ctx.userId, "automation_creee", "automation", auto.id, parsed.data.name);
    revalidatePath("/automations");
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Erreur" };
  }
}

export async function toggleAutomationAction(id: string, enabled: boolean) {
  const ctx = await requireRole("owner");
  try {
    await updateAutomation(id, ctx.shopId, { enabled });
    revalidatePath("/automations");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function deleteAutomationAction(id: string) {
  const ctx = await requireRole("owner");
  try {
    await deleteAutomation(id, ctx.shopId);
    await logActivity(ctx.shopId, ctx.userId, "automation_supprimee", "automation", id);
    revalidatePath("/automations");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
