import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/require-role";
import { getUserNotifications, getUnreadCount, markAsRead, markAllAsRead } from "@/lib/db/queries/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  let ctx;
  try { ctx = await getAuthContext(); } catch { return NextResponse.json({ notifications: [], unread: 0 }); }

  try {
    const [notifs, unread] = await Promise.all([
      getUserNotifications(ctx.userId, 30),
      getUnreadCount(ctx.userId),
    ]);
    return NextResponse.json({ notifications: notifs, unread });
  } catch {
    return NextResponse.json({ notifications: [], unread: 0 });
  }
}

export async function POST(req: NextRequest) {
  let ctx;
  try { ctx = await getAuthContext(); } catch { return NextResponse.json({ error: "Non autorisé" }, { status: 401 }); }

  try {
    const body = await req.json();

    if (body.action === "mark_read" && body.id) {
      await markAsRead(body.id, ctx.userId);
      return NextResponse.json({ success: true });
    }

    if (body.action === "mark_all_read") {
      await markAllAsRead(ctx.userId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Action inconnue" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
