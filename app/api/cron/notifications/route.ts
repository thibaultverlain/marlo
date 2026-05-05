import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { products, sourcingRequests, shops, teamMembers, notifications } from "@/lib/db/schema";
import { sql, and, inArray, eq } from "drizzle-orm";
import { createNotification } from "@/lib/db/queries/notifications";

export const dynamic = "force-dynamic";

/**
 * Called daily (via Vercel Cron or manually).
 * Generates dormant_stock and deadline_soon notifications.
 * Idempotent: skips if a notification of the same type was already sent today.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    let created = 0;

    // Get all shops
    const allShops = await db.select({ id: shops.id }).from(shops);

    // Import automation engine
    const { processDailyAutomations } = await import("@/lib/automations/engine");

    for (const shop of allShops) {
      // Get shop owner (notifications go to owner)
      const [owner] = await db
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .where(and(eq(teamMembers.shopId, shop.id), eq(teamMembers.role, "owner")))
        .limit(1);
      if (!owner) continue;

      // Check if we already sent today
      const [existing] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(notifications)
        .where(
          and(
            eq(notifications.shopId, shop.id),
            eq(notifications.userId, owner.userId),
            inArray(notifications.type, ["dormant_stock", "deadline_soon"]),
            sql`created_at::date = ${today}::date`
          )
        );
      if ((existing?.count ?? 0) > 0) continue;

      // Dormant stock: articles en stock depuis 30+ jours
      const [dormant] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(
          and(
            eq(products.shopId, shop.id),
            inArray(products.status, ["en_stock", "en_vente"]),
            sql`created_at < NOW() - INTERVAL '30 days'`
          )
        );
      if ((dormant?.count ?? 0) > 0) {
        await createNotification(
          shop.id,
          owner.userId,
          "dormant_stock",
          `${dormant.count} article${dormant.count > 1 ? "s" : ""} dormant${dormant.count > 1 ? "s" : ""}`,
          "En stock depuis plus de 30 jours",
          "/products"
        );
        created++;
      }

      // Deadline soon: sourcing avec deadline dans 7 jours
      const [deadlines] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(sourcingRequests)
        .where(
          and(
            eq(sourcingRequests.shopId, shop.id),
            inArray(sourcingRequests.status, ["ouvert", "en_recherche"]),
            sql`deadline IS NOT NULL AND deadline <= NOW() + INTERVAL '7 days' AND deadline >= NOW()`
          )
        );
      if ((deadlines?.count ?? 0) > 0) {
        await createNotification(
          shop.id,
          owner.userId,
          "deadline_soon",
          `${deadlines.count} sourcing avec deadline proche`,
          "Dans moins de 7 jours",
          "/sourcing"
        );
        created++;
      }

      // Process custom automations
      const autoCount = await processDailyAutomations(shop.id);
      created += autoCount;
    }

    return NextResponse.json({ success: true, created });
  } catch (err) {
    console.error("Cron notifications error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
