import { db } from "../client";
import { notifications } from "../schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function getUserNotifications(userId: string, limit = 30) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadCount(userId: string): Promise<number> {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
  return rows[0]?.count ?? 0;
}

export async function markAsRead(notificationId: string, userId: string) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
}

export async function markAllAsRead(userId: string) {
  await db
    .update(notifications)
    .set({ read: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
}

/**
 * Create a notification for a specific user.
 */
export async function createNotification(
  shopId: string,
  userId: string,
  type: string,
  title: string,
  body?: string,
  href?: string
) {
  await db.insert(notifications).values({
    shopId,
    userId,
    type,
    title,
    body: body ?? null,
    href: href ?? null,
  });
}

/**
 * Create notifications for all members of a shop (except the actor).
 */
export async function notifyShopMembers(
  shopId: string,
  excludeUserId: string,
  type: string,
  title: string,
  body?: string,
  href?: string
) {
  const { teamMembers } = await import("../schema");
  const members = await db
    .select({ userId: teamMembers.userId })
    .from(teamMembers)
    .where(eq(teamMembers.shopId, shopId));

  const targets = members.filter((m) => m.userId !== excludeUserId);
  if (targets.length === 0) return;

  await db.insert(notifications).values(
    targets.map((m) => ({
      shopId,
      userId: m.userId,
      type,
      title,
      body: body ?? null,
      href: href ?? null,
    }))
  );
}
