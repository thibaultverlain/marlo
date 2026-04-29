import { getAuthContext } from "@/lib/auth/require-role";
import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { products, sourcingRequests } from "@/lib/db/schema";
import { sql, and, inArray, eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  let ctx;
  try { ctx = await getAuthContext(); } catch { return NextResponse.json({ alerts: [], count: 0 }); }

  try {
    const [dormantRows, deadlineRows] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(
          and(
            eq(products.shopId, ctx.shopId),
            inArray(products.status, ["en_stock", "en_vente"]),
            sql`created_at < NOW() - INTERVAL '30 days'`
          )
        ),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(sourcingRequests)
        .where(
          and(
            eq(sourcingRequests.shopId, ctx.shopId),
            inArray(sourcingRequests.status, ["ouvert", "en_recherche"]),
            sql`deadline IS NOT NULL AND deadline <= NOW() + INTERVAL '7 days'`
          )
        ),
    ]);

    const alerts = [];

    const dormant = dormantRows[0]?.count ?? 0;
    if (dormant > 0) {
      alerts.push({
        type: "dormant",
        message: `${dormant} article${dormant > 1 ? "s" : ""} dormant${dormant > 1 ? "s" : ""} depuis plus de 30 jours`,
        href: "/products",
        severity: "warning",
      });
    }

    const deadlines = deadlineRows[0]?.count ?? 0;
    if (deadlines > 0) {
      alerts.push({
        type: "deadline",
        message: `${deadlines} sourcing avec deadline dans moins de 7 jours`,
        href: "/sourcing",
        severity: "warning",
      });
    }

    return NextResponse.json({ alerts, count: alerts.length });
  } catch (err) {
    console.error("Alerts error:", err);
    return NextResponse.json({ alerts: [], count: 0 });
  }
}
