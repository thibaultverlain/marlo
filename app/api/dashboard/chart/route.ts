import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { sales } from "@/lib/db/schema";
import { sql, gte, lte, and, eq } from "drizzle-orm";
import { getAuthContext } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

type DataPoint = {
  label: string;
  fullLabel?: string; // pour tooltip
  revenue: number;
  count: number;      // nb ventes sur ce point
};

export async function GET(req: NextRequest) {
  let ctx;
  try { ctx = await getAuthContext(); } catch { return NextResponse.json({ error: "Non autorise" }, { status: 401 }); }
  const shopId = ctx.shopId;

  const period = req.nextUrl.searchParams.get("period") ?? "month";
  const now = new Date();

  try {
    let data: DataPoint[] = [];
    let granularity: "hour" | "day" | "month" | "week" = "day";

    if (period === "year") {
      granularity = "month";
      const year = now.getFullYear();
      const rows = await db
        .select({
          month: sql<number>`extract(month from sold_at)::int`,
          revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
          count: sql<number>`count(*)::int`,
        })
        .from(sales)
        .where(and(
          eq(sales.shopId, shopId),
          gte(sales.soldAt, new Date(year, 0, 1)),
          lte(sales.soldAt, new Date(year, 11, 31, 23, 59, 59)),
        ))
        .groupBy(sql`extract(month from sold_at)`)
        .orderBy(sql`extract(month from sold_at)`);

      const months = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aout", "Sep", "Oct", "Nov", "Dec"];
      const fullMonths = ["Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin", "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre"];
      data = months.map((label, i) => {
        const row = rows.find((r) => r.month === i + 1);
        return {
          label,
          fullLabel: `${fullMonths[i]} ${year}`,
          revenue: Number(row?.revenue ?? 0),
          count: Number(row?.count ?? 0),
        };
      });

    } else if (period === "month") {
      granularity = "day";
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const monthLabel = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aout", "Sep", "Oct", "Nov", "Dec"][month];

      const rows = await db
        .select({
          day: sql<number>`extract(day from sold_at)::int`,
          revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
          count: sql<number>`count(*)::int`,
        })
        .from(sales)
        .where(and(
          eq(sales.shopId, shopId),
          gte(sales.soldAt, new Date(year, month, 1)),
          lte(sales.soldAt, new Date(year, month + 1, 0, 23, 59, 59)),
        ))
        .groupBy(sql`extract(day from sold_at)`)
        .orderBy(sql`extract(day from sold_at)`);

      data = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const row = rows.find((r) => r.day === day);
        return {
          label: String(day),
          fullLabel: `${day} ${monthLabel}`,
          revenue: Number(row?.revenue ?? 0),
          count: Number(row?.count ?? 0),
        };
      });

    } else if (period === "week") {
      granularity = "day";
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const rows = await db
        .select({
          dow: sql<number>`extract(isodow from sold_at)::int`,
          revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
          count: sql<number>`count(*)::int`,
        })
        .from(sales)
        .where(and(eq(sales.shopId, shopId), gte(sales.soldAt, monday), lte(sales.soldAt, sunday)))
        .groupBy(sql`extract(isodow from sold_at)`)
        .orderBy(sql`extract(isodow from sold_at)`);

      const dayLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
      const fullDayLabels = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
      data = dayLabels.map((label, i) => {
        const row = rows.find((r) => r.dow === i + 1);
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return {
          label,
          fullLabel: `${fullDayLabels[i]} ${d.getDate()}/${d.getMonth() + 1}`,
          revenue: Number(row?.revenue ?? 0),
          count: Number(row?.count ?? 0),
        };
      });

    } else if (period === "day") {
      granularity = "hour";
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const rows = await db
        .select({
          hour: sql<number>`extract(hour from sold_at)::int`,
          revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
          count: sql<number>`count(*)::int`,
        })
        .from(sales)
        .where(and(eq(sales.shopId, shopId), gte(sales.soldAt, startOfDay), lte(sales.soldAt, endOfDay)))
        .groupBy(sql`extract(hour from sold_at)`)
        .orderBy(sql`extract(hour from sold_at)`);

      data = Array.from({ length: 24 }, (_, i) => {
        const row = rows.find((r) => r.hour === i);
        return {
          label: `${String(i).padStart(2, "0")}h`,
          fullLabel: `${String(i).padStart(2, "0")}:00 - ${String(i).padStart(2, "0")}:59`,
          revenue: Number(row?.revenue ?? 0),
          count: Number(row?.count ?? 0),
        };
      });

    } else if (period === "custom") {
      const fromStr = req.nextUrl.searchParams.get("from");
      const toStr = req.nextUrl.searchParams.get("to");
      if (!fromStr || !toStr) {
        return NextResponse.json({ data: [], error: "Dates requises" }, { status: 400 });
      }
      const fm = fromStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      const tm = toStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!fm || !tm) {
        return NextResponse.json({ data: [], error: "Format date invalide" }, { status: 400 });
      }
      const from = new Date(Number(fm[1]), Number(fm[2]) - 1, Number(fm[3]), 0, 0, 0);
      const to = new Date(Number(tm[1]), Number(tm[2]) - 1, Number(tm[3]), 23, 59, 59, 999);
      const diffDays = Math.ceil((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 31) {
        granularity = "day";
        // Group by day en heure locale serveur (utilise les composants Date, pas to_char)
        const rows = await db
          .select({
            year: sql<number>`extract(year from sold_at)::int`,
            month: sql<number>`extract(month from sold_at)::int`,
            day: sql<number>`extract(day from sold_at)::int`,
            revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
            count: sql<number>`count(*)::int`,
          })
          .from(sales)
          .where(and(eq(sales.shopId, shopId), gte(sales.soldAt, from), lte(sales.soldAt, to)))
          .groupBy(sql`extract(year from sold_at), extract(month from sold_at), extract(day from sold_at)`);

        // Build map en utilisant les composants annee/mois/jour (pas de timezone bug)
        const dayMap = new Map<string, { revenue: number; count: number }>();
        for (const r of rows) {
          const key = `${r.year}-${String(r.month).padStart(2, "0")}-${String(r.day).padStart(2, "0")}`;
          dayMap.set(key, { revenue: Number(r.revenue), count: Number(r.count) });
        }

        data = [];
        const cursor = new Date(from);
        while (cursor <= to) {
          const y = cursor.getFullYear();
          const m = cursor.getMonth() + 1;
          const d = cursor.getDate();
          const key = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
          const entry = dayMap.get(key);
          data.push({
            label: `${d}/${m}`,
            fullLabel: cursor.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: y !== now.getFullYear() ? "numeric" : undefined }),
            revenue: entry?.revenue ?? 0,
            count: entry?.count ?? 0,
          });
          cursor.setDate(cursor.getDate() + 1);
        }
      } else {
        granularity = "week";
        const rows = await db
          .select({
            weekStart: sql<Date>`date_trunc('week', sold_at)`,
            revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
            count: sql<number>`count(*)::int`,
          })
          .from(sales)
          .where(and(eq(sales.shopId, shopId), gte(sales.soldAt, from), lte(sales.soldAt, to)))
          .groupBy(sql`date_trunc('week', sold_at)`)
          .orderBy(sql`date_trunc('week', sold_at)`);

        data = rows.map((r) => {
          const d = new Date(r.weekStart);
          const end = new Date(d);
          end.setDate(d.getDate() + 6);
          return {
            label: `${d.getDate()}/${d.getMonth() + 1}`,
            fullLabel: `Semaine du ${d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} au ${end.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`,
            revenue: Number(r.revenue),
            count: Number(r.count),
          };
        });
      }
    }

    // Meta global
    const total = data.reduce((s, d) => s + d.revenue, 0);
    const totalCount = data.reduce((s, d) => s + d.count, 0);
    const nonZeroPoints = data.filter((d) => d.revenue > 0).length;

    return NextResponse.json({
      data,
      meta: {
        total,
        count: totalCount,
        nonZeroPoints,
        granularity,
        period,
      },
    });
  } catch (err) {
    console.error("Chart data error:", err);
    return NextResponse.json({ data: [], error: "Erreur" }, { status: 500 });
  }
}
