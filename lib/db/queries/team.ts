import { db } from "@/lib/db/client";
import { teamMembers, teamInvitations, shops, activityLog } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// ── Team Members ──────────────────────────────────────

export async function getTeamMembers(shopId: string) {
  const members = await db
    .select({
      id: teamMembers.id,
      userId: teamMembers.userId,
      role: teamMembers.role,
      joinedAt: teamMembers.joinedAt,
    })
    .from(teamMembers)
    .where(eq(teamMembers.shopId, shopId))
    .orderBy(desc(teamMembers.joinedAt));

  // Fetch user emails from Supabase Auth
  const supabase = await createSupabaseServerClient();
  const enriched = await Promise.all(
    members.map(async (m) => {
      // We can't call admin.getUserById from client, so we store email in a pragmatic way
      // For now, return what we have
      return { ...m, email: null as string | null, shopId };
    })
  );

  return enriched;
}

export async function getTeamMemberWithEmail(shopId: string) {
  const members = await db
    .select({
      id: teamMembers.id,
      userId: teamMembers.userId,
      role: teamMembers.role,
      permissions: teamMembers.permissions,
      joinedAt: teamMembers.joinedAt,
    })
    .from(teamMembers)
    .where(eq(teamMembers.shopId, shopId))
    .orderBy(desc(teamMembers.joinedAt));

  return members;
}

export async function removeMember(memberId: string, shopId: string) {
  // Check it's not the owner
  const member = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.id, memberId), eq(teamMembers.shopId, shopId)))
    .limit(1);

  if (!member.length) throw new Error("Membre introuvable");
  if (member[0].role === "owner") throw new Error("Impossible de retirer le propriétaire");

  await db.delete(teamMembers).where(eq(teamMembers.id, memberId));
}

export async function updateMemberRole(memberId: string, shopId: string, role: "manager" | "seller") {
  const member = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.id, memberId), eq(teamMembers.shopId, shopId)))
    .limit(1);

  if (!member.length) throw new Error("Membre introuvable");
  if (member[0].role === "owner") throw new Error("Impossible de changer le rôle du propriétaire");

  await db
    .update(teamMembers)
    .set({ role })
    .where(eq(teamMembers.id, memberId));
}

// ── Invitations ───────────────────────────────────────

export async function getPendingInvitations(shopId: string) {
  return db
    .select()
    .from(teamInvitations)
    .where(and(eq(teamInvitations.shopId, shopId), eq(teamInvitations.status, "pending")))
    .orderBy(desc(teamInvitations.createdAt));
}

export async function createInvitation(shopId: string, email: string, role: "manager" | "seller", invitedBy: string) {
  // Check if already invited
  const existing = await db
    .select()
    .from(teamInvitations)
    .where(
      and(
        eq(teamInvitations.shopId, shopId),
        eq(teamInvitations.email, email.toLowerCase()),
        eq(teamInvitations.status, "pending")
      )
    )
    .limit(1);

  if (existing.length) throw new Error("Cette adresse a déjà une invitation en attente");

  // Check if already a member (by email lookup — need to check auth users)
  // For now we skip this check as it requires admin API

  const token = crypto.randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  const [invitation] = await db
    .insert(teamInvitations)
    .values({
      shopId,
      email: email.toLowerCase(),
      role,
      invitedBy,
      token,
      expiresAt,
    })
    .returning();

  return invitation;
}

export async function revokeInvitation(invitationId: string, shopId: string) {
  await db
    .update(teamInvitations)
    .set({ status: "revoked" })
    .where(and(eq(teamInvitations.id, invitationId), eq(teamInvitations.shopId, shopId)));
}

export async function acceptInvitation(token: string, userId: string) {
  const [invitation] = await db
    .select()
    .from(teamInvitations)
    .where(and(eq(teamInvitations.token, token), eq(teamInvitations.status, "pending")))
    .limit(1);

  if (!invitation) throw new Error("Invitation introuvable ou déjà utilisée");
  if (new Date() > invitation.expiresAt) {
    await db.update(teamInvitations).set({ status: "expired" }).where(eq(teamInvitations.id, invitation.id));
    throw new Error("Invitation expirée");
  }

  // Add to team
  await db.insert(teamMembers).values({
    shopId: invitation.shopId,
    userId,
    role: invitation.role,
  }).onConflictDoNothing();

  // Mark invitation as accepted
  await db.update(teamInvitations).set({ status: "accepted" }).where(eq(teamInvitations.id, invitation.id));

  // Notify shop owner that someone joined
  const { notifyShopMembers } = await import("./notifications");
  await notifyShopMembers(
    invitation.shopId,
    userId,
    "member_joined",
    "Nouveau membre",
    `${invitation.email} a rejoint l'equipe (${invitation.role})`,
    "/team"
  );

  return invitation;
}

// ── Shop ──────────────────────────────────────────────

export async function getShop(shopId: string) {
  const [shop] = await db.select().from(shops).where(eq(shops.id, shopId)).limit(1);
  return shop;
}

export async function updateShopName(shopId: string, name: string) {
  await db.update(shops).set({ name }).where(eq(shops.id, shopId));
}

// ── Activity Log ──────────────────────────────────────

export async function logActivity(
  shopId: string,
  userId: string,
  action: string,
  entity?: string,
  entityId?: string,
  details?: string
) {
  await db.insert(activityLog).values({
    shopId,
    userId,
    action,
    entity,
    entityId,
    details,
  });
}

export async function getRecentActivity(shopId: string, limit = 30) {
  return db
    .select()
    .from(activityLog)
    .where(eq(activityLog.shopId, shopId))
    .orderBy(desc(activityLog.createdAt))
    .limit(limit);
}
