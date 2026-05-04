"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { db } from "@/lib/db/client";
import { teamMembers } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { logActivity } from "@/lib/db/queries/team";

export async function updateMemberPermissionsAction(memberId: string, permissions: string[]) {
  const ctx = await requireRole("owner");

  try {
    const [member] = await db
      .select()
      .from(teamMembers)
      .where(and(eq(teamMembers.id, memberId), eq(teamMembers.shopId, ctx.shopId)))
      .limit(1);

    if (!member) return { error: "Membre introuvable" };
    if (member.role === "owner") return { error: "Impossible de modifier les permissions du proprietaire" };

    await db
      .update(teamMembers)
      .set({ permissions: JSON.stringify(permissions) })
      .where(eq(teamMembers.id, memberId));

    await logActivity(ctx.shopId, ctx.userId, "permissions_modifiees", "team_member", memberId, `${permissions.length} permissions`);

    revalidatePath("/team");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
