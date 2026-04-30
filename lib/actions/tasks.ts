"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getAuthContext } from "@/lib/auth/require-role";
import { createTask, updateTask, deleteTask, completeTask } from "@/lib/db/queries/tasks";
import { logActivity } from "@/lib/db/queries/team";
import { createNotification } from "@/lib/db/queries/notifications";

const taskSchema = z.object({
  title: z.string().min(1, "Titre requis"),
  description: z.string().optional().nullable(),
  assignedTo: z.string().uuid().optional().nullable().or(z.literal("")),
  priority: z.enum(["haute", "normale", "basse"]),
  relatedEntity: z.string().optional().nullable(),
  relatedEntityId: z.string().uuid().optional().nullable().or(z.literal("")),
  dueDate: z.string().optional().nullable(),
});

export async function createTaskAction(formData: FormData) {
  const ctx = await getAuthContext();
  const parsed = taskSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    assignedTo: formData.get("assignedTo"),
    priority: formData.get("priority") || "normale",
    relatedEntity: formData.get("relatedEntity"),
    relatedEntityId: formData.get("relatedEntityId"),
    dueDate: formData.get("dueDate"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const task = await createTask({
      shopId: ctx.shopId,
      createdBy: ctx.userId,
      title: parsed.data.title,
      description: parsed.data.description || null,
      assignedTo: parsed.data.assignedTo && parsed.data.assignedTo.length > 0 ? parsed.data.assignedTo : null,
      priority: parsed.data.priority,
      relatedEntity: parsed.data.relatedEntity || null,
      relatedEntityId: parsed.data.relatedEntityId && parsed.data.relatedEntityId.length > 0 ? parsed.data.relatedEntityId : null,
      dueDate: parsed.data.dueDate || null,
      status: "a_faire",
    });

    await logActivity(ctx.shopId, ctx.userId, "tache_creee", "task", task.id, parsed.data.title);

    if (task.assignedTo && task.assignedTo !== ctx.userId) {
      await createNotification(
        ctx.shopId,
        task.assignedTo,
        "task_assigned",
        "Nouvelle tache assignee",
        parsed.data.title,
        "/tasks"
      );
    }

    revalidatePath("/tasks");
    return { success: true };
  } catch (e: any) {
    return { error: e.message || "Erreur lors de la création" };
  }
}

export async function completeTaskAction(taskId: string) {
  const ctx = await getAuthContext();
  try {
    await completeTask(taskId);
    await logActivity(ctx.shopId, ctx.userId, "tache_terminee", "task", taskId);
    revalidatePath("/tasks");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function updateTaskStatusAction(taskId: string, status: "a_faire" | "en_cours" | "fait") {
  const ctx = await getAuthContext();
  try {
    const data: any = { status };
    if (status === "fait") data.completedAt = new Date();
    await updateTask(taskId, data);
    revalidatePath("/tasks");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function deleteTaskAction(taskId: string) {
  const ctx = await getAuthContext();
  try {
    await deleteTask(taskId);
    await logActivity(ctx.shopId, ctx.userId, "tache_supprimee", "task", taskId);
    revalidatePath("/tasks");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
