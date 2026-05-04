import Sidebar from "@/components/layout/sidebar";
import { getAuthContext, getUserShops } from "@/lib/auth/require-role";
import { db } from "@/lib/db/client";
import { products, sourcingRequests } from "@/lib/db/schema";
import { sql, and, inArray, eq } from "drizzle-orm";

async function getAlertCount(shopId: string): Promise<number> {
  try {
    const [[dormant], [deadlines]] = await Promise.all([
      db.select({ c: sql<number>`count(*)::int` }).from(products)
        .where(and(eq(products.shopId, shopId), inArray(products.status, ["en_stock", "en_vente"]), sql`created_at < NOW() - INTERVAL '30 days'`)),
      db.select({ c: sql<number>`count(*)::int` }).from(sourcingRequests)
        .where(and(eq(sourcingRequests.shopId, shopId), inArray(sourcingRequests.status, ["ouvert", "en_recherche"]), sql`deadline IS NOT NULL AND deadline <= NOW() + INTERVAL '7 days'`)),
    ]);
    return ((dormant?.c ?? 0) > 0 ? 1 : 0) + ((deadlines?.c ?? 0) > 0 ? 1 : 0);
  } catch { return 0; }
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  let role = "owner";
  let permissions: string[] = [];
  let shops: { shopId: string; shopName: string; role: string }[] = [];
  let currentShopId = "";
  let currentShopName = "";
  let alertCount = 0;

  try {
    const ctx = await getAuthContext();
    role = ctx.role;
    permissions = ctx.permissions;
    currentShopId = ctx.shopId;
    currentShopName = ctx.shopName;
    shops = (await getUserShops(ctx.userId)).map((s) => ({
      shopId: s.shopId,
      shopName: s.shopName,
      role: s.role,
    }));
    alertCount = await getAlertCount(ctx.shopId);
  } catch {}

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Sidebar
        role={role}
        permissions={permissions}
        shops={shops}
        currentShopId={currentShopId}
        currentShopName={currentShopName}
        alertCount={alertCount}
      />
      <main className="lg:ml-[220px] min-h-screen pt-14 lg:pt-0">
        <div className="max-w-6xl mx-auto px-4 py-5 lg:px-8 lg:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
