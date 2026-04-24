import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { sales } from "@/lib/db/schema";
import { sql, gte, lte, and } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/require-auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth();
  if (auth instanceof NextResponse) return auth;

  const period = req.nextUrl.searchParams.get("period") ?? "month";
  const now = new Date();

  try {
    let data: { label: string; revenue: number }[] = [];

    if (period === "year") {
      // 12 months of current year
      const year = now.getFullYear();
      const rows = await db
        .select({
          month: sql<number>`extract(month from sold_at)::int`,
          revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
        })
        .from(sales)
        .where(
          and(
            gte(sales.soldAt, new Date(year, 0, 1)),
            lte(sales.soldAt, new Date(year, 11, 31, 23, 59, 59))
          )
        )
        .groupBy(sql`extract(month from sold_at)`)
        .orderBy(sql`extract(month from sold_at)`);

      const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];
      data = months.map((label, i) => {
        const row = rows.find((r) => r.month === i + 1);
        return { label, revenue: Number(row?.revenue ?? 0) };
      });
    } else if (period === "month") {
      // 30/31 days of current month
      const year = now.getFullYear();
      const month = now.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      const rows = await db
        .select({
          day: sql<number>`extract(day from sold_at)::int`,
          revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
        })
        .from(sales)
        .where(
          and(
            gte(sales.soldAt, new Date(year, month, 1)),
            lte(sales.soldAt, new Date(year, month + 1, 0, 23, 59, 59))
          )
        )
        .groupBy(sql`extract(day from sold_at)`)
        .orderBy(sql`extract(day from sold_at)`);

      data = Array.from({ length: daysInMonth }, (_, i) => {
        const day = i + 1;
        const row = rows.find((r) => r.day === day);
        return { label: String(day), revenue: Number(row?.revenue ?? 0) };
      });
    } else if (period === "week") {
      // Current week (Mon-Sun)
      const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon...
      const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);

      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);

      const rows = await db
        .select({
          dow: sql<number>`extract(isodow from sold_at)::int`, // 1=Mon, 7=Sun
          revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
        })
        .from(sales)
        .where(and(gte(sales.soldAt, monday), lte(sales.soldAt, sunday)))
        .groupBy(sql`extract(isodow from sold_at)`)
        .orderBy(sql`extract(isodow from sold_at)`);

      const dayLabels = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
      data = dayLabels.map((label, i) => {
        const row = rows.find((r) => r.dow === i + 1);
        return { label, revenue: Number(row?.revenue ?? 0) };
      });
    } else if (period === "day") {
      // 24 hours of today
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

      const rows = await db
        .select({
          hour: sql<number>`extract(hour from sold_at)::int`,
          revenue: sql<number>`coalesce(sum(sale_price), 0)::numeric`,
        })
        .from(sales)
        .where(and(gte(sales.soldAt, startOfDay), lte(sales.soldAt, endOfDay)))
        .groupBy(sql`extract(hour from sold_at)`)
        .orderBy(sql`extract(hour from sold_at)`);

      data = Array.from({ length: 24 }, (_, i) => {
        const row = rows.find((r) => r.hour === i);
        return { label: `${String(i).padStart(2, "0")}h`, revenue: Number(row?.revenue ?? 0) };
      });
    }

    return NextResponse.json({ data });
  } catch (err) {
    console.error("Chart data error:", err);
    return NextResponse.json({ data: [], error: "Erreur" }, { status: 500 });
  }
}
