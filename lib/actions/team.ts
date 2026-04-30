"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import {
  createInvitation,
  revokeInvitation,
  removeMember,
  updateMemberRole,
  updateShopName,
  logActivity,
} from "@/lib/db/queries/team";
import { notifyShopMembers } from "@/lib/db/queries/notifications";

// ── Invite ────────────────────────────────────────────

const inviteSchema = z.object({
  email: z.string().email("Email invalide"),
  role: z.enum(["manager", "seller"]),
});

export async function inviteMemberAction(formData: FormData) {
  const ctx = await requireRole("owner");
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const invitation = await createInvitation(
      ctx.shopId,
      parsed.data.email,
      parsed.data.role,
      ctx.userId
    );

    await logActivity(ctx.shopId, ctx.userId, "invitation_envoyee", "team_invitation", invitation.id, `${parsed.data.email} (${parsed.data.role})`);

    revalidatePath("/team");
    return { success: true, token: invitation.token };
  } catch (e: any) {
    return { error: e.message || "Erreur lors de l'invitation" };
  }
}

// ── Revoke invitation ─────────────────────────────────

export async function revokeInvitationAction(invitationId: string) {
  const ctx = await requireRole("owner");

  try {
    await revokeInvitation(invitationId, ctx.shopId);
    await logActivity(ctx.shopId, ctx.userId, "invitation_revoquee", "team_invitation", invitationId);
    revalidatePath("/team");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ── Remove member ─────────────────────────────────────

export async function removeMemberAction(memberId: string) {
  const ctx = await requireRole("owner");

  try {
    await removeMember(memberId, ctx.shopId);
    await logActivity(ctx.shopId, ctx.userId, "membre_retire", "team_member", memberId);
    revalidatePath("/team");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ── Update role ───────────────────────────────────────

export async function updateMemberRoleAction(memberId: string, role: "manager" | "seller") {
  const ctx = await requireRole("owner");

  try {
    await updateMemberRole(memberId, ctx.shopId, role);
    await logActivity(ctx.shopId, ctx.userId, "role_modifie", "team_member", memberId, `Nouveau rôle : ${role}`);
    revalidatePath("/team");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ── Update shop name ──────────────────────────────────

export async function updateShopNameAction(name: string) {
  const ctx = await requireRole("owner");

  if (!name || name.trim().length < 2) {
    return { error: "Le nom doit faire au moins 2 caractères" };
  }

  try {
    await updateShopName(ctx.shopId, name.trim());
    await logActivity(ctx.shopId, ctx.userId, "boutique_renommee", "shop", ctx.shopId, name.trim());
    revalidatePath("/team");
    revalidatePath("/settings");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
