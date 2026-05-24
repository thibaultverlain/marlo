import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { products, sourcingRequests, shops, teamMembers, notifications } from "@/lib/db/schema";
import { sql, and, inArray, eq, desc } from "drizzle-orm";
import { createNotification } from "@/lib/db/queries/notifications";

export const dynamic = "force-dynamic";

const COOLDOWN_DAYS = 7;

/**
 * Verifie si on doit creer une nouvelle notif d'un type donne.
 * Regle : on cree une notif SEULEMENT si :
 *   - aucune notif non-lue de ce type n'existe deja (pas de doublon visuel)
 *   - ET la derniere notif lue de ce type date de plus de COOLDOWN_DAYS jours
 *     (sinon le user qui lit chaque jour serait spam de la meme info)
 */
async function shouldCreateNotification(
  shopId: string,
  userId: string,
  type: string,
): Promise<boolean> {
  // Notif non-lue active ?
  const [unread] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(
      and(
        eq(notifications.shopId, shopId),
        eq(notifications.userId, userId),
        eq(notifications.type, type),
        eq(notifications.read, false),
      ),
    );
  if ((unread?.count ?? 0) > 0) return false;

  // Derniere notif (lue) de ce type — si trop recente, on attend
  const [recent] = await db
    .select({ createdAt: notifications.createdAt })
    .from(notifications)
    .where(
      and(
        eq(notifications.shopId, shopId),
        eq(notifications.userId, userId),
        eq(notifications.type, type),
      ),
    )
    .orderBy(desc(notifications.createdAt))
    .limit(1);

  if (recent) {
    const ageMs = Date.now() - recent.createdAt.getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    if (ageDays < COOLDOWN_DAYS) return false;
  }

  return true;
}

/**
 * Called daily (via Vercel Cron) ou manuellement.
 * Genere dormant_stock et deadline_soon avec cooldown anti-spam.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let created = 0;
    let skipped = 0;

    const allShops = await db.select({ id: shops.id }).from(shops);

    for (const shop of allShops) {
      const [owner] = await db
        .select({ userId: teamMembers.userId })
        .from(teamMembers)
        .where(and(eq(teamMembers.shopId, shop.id), eq(teamMembers.role, "owner")))
        .limit(1);
      if (!owner) continue;

      // ─── Dormant stock ─────────────────────────────────
      const canCreateDormant = await shouldCreateNotification(shop.id, owner.userId, "dormant_stock");
      if (canCreateDormant) {
        const [dormant] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(products)
          .where(
            and(
              eq(products.shopId, shop.id),
              inArray(products.status, ["en_stock", "en_vente"]),
              sql`created_at < NOW() - INTERVAL '30 days'`,
            ),
          );
        if ((dormant?.count ?? 0) > 0) {
          await createNotification(
            shop.id,
            owner.userId,
            "dormant_stock",
            `${dormant.count} article${dormant.count > 1 ? "s" : ""} dormant${dormant.count > 1 ? "s" : ""}`,
            "En stock depuis plus de 30 jours — voir les suggestions de baisse",
            "/products/dormants",
          );
          created++;
        }
      } else {
        skipped++;
      }

      // ─── Deadline soon ─────────────────────────────────
      const canCreateDeadline = await shouldCreateNotification(shop.id, owner.userId, "deadline_soon");
      if (canCreateDeadline) {
        const [deadlines] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(sourcingRequests)
          .where(
            and(
              eq(sourcingRequests.shopId, shop.id),
              inArray(sourcingRequests.status, ["ouvert", "en_recherche"]),
              sql`deadline IS NOT NULL AND deadline <= NOW() + INTERVAL '7 days' AND deadline >= NOW()`,
            ),
          );
        if ((deadlines?.count ?? 0) > 0) {
          await createNotification(
            shop.id,
            owner.userId,
            "deadline_soon",
            `${deadlines.count} sourcing avec deadline proche`,
            "Dans moins de 7 jours",
            "/sourcing",
          );
          created++;
        }
      } else {
        skipped++;
      }
    }

    return NextResponse.json({ success: true, created, skipped });
  } catch (err) {
    console.error("Cron notifications error:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
