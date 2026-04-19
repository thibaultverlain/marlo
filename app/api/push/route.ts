import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { sql } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In-memory subscription store (resets on cold start - fine for personal use)
const subscriptions = new Set<string>();

async function getWebPush() {
  const wp = await import("web-push");
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const priv = process.env.VAPID_PRIVATE_KEY ?? "";
  if (pub && priv) {
    wp.setVapidDetails("mailto:contact@maisonroselin.com", pub, priv);
  }
  return wp;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, subscription } = body;

    if (action === "subscribe" && subscription) {
      subscriptions.add(JSON.stringify(subscription));
      return NextResponse.json({ success: true });
    }
    if (action === "unsubscribe" && subscription) {
      subscriptions.delete(JSON.stringify(subscription));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action invalide" }, { status: 400 });
  } catch (err) {
    console.error("Push sub error:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const webPush = await getWebPush();
    const alerts: { title: string; body: string }[] = [];

    const dormantResult = await db.execute(
      sql`SELECT count(*)::int as count FROM products WHERE status IN ('en_stock', 'en_vente') AND created_at < NOW() - INTERVAL '30 days'`
    );
    const dormantCount = (dormantResult as any)[0]?.count ?? 0;
    if (dormantCount > 0) {
      alerts.push({ title: "Stock dormant", body: `${dormantCount} article${dormantCount > 1 ? "s" : ""} en stock depuis +30 jours` });
    }

    const deadlineResult = await db.execute(
      sql`SELECT count(*)::int as count FROM sourcing_requests WHERE status IN ('ouvert', 'en_recherche') AND deadline IS NOT NULL AND deadline <= NOW() + INTERVAL '3 days'`
    );
    const deadlineCount = (deadlineResult as any)[0]?.count ?? 0;
    if (deadlineCount > 0) {
      alerts.push({ title: "Deadline sourcing", body: `${deadlineCount} demande${deadlineCount > 1 ? "s" : ""} deadline < 3 jours` });
    }

    if (alerts.length === 0) {
      return NextResponse.json({ sent: 0, message: "No alerts" });
    }

    let sent = 0;
    for (const subStr of subscriptions) {
      try {
        const subscription = JSON.parse(subStr);
        for (const alert of alerts) {
          await webPush.sendNotification(
            subscription,
            JSON.stringify({ title: alert.title, body: alert.body, icon: "/icons/icon-192.png", url: "/dashboard" })
          );
          sent++;
        }
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          subscriptions.delete(subStr);
        }
      }
    }

    return NextResponse.json({ sent, alerts: alerts.length });
  } catch (err) {
    console.error("Push send error:", err);
    return NextResponse.json({ error: "Erreur" }, { status: 500 });
  }
}
