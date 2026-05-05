import { getAuthContext } from "@/lib/auth/require-role";
import { getOrdersByStatus, getOrderCounts } from "@/lib/db/queries/orders";
import OrdersPageClient from "@/components/orders/orders-page-client";
export const dynamic = "force-dynamic";

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const status = sp.status || "a_expedier";
  const ctx = await getAuthContext();
  const [orders, counts] = await Promise.all([
    getOrdersByStatus(ctx.shopId, status),
    getOrderCounts(ctx.shopId),
  ]);

  return (
    <div className="space-y-6 page-enter">
      <OrdersPageClient orders={orders} counts={counts} activeStatus={status} />
    </div>
  );
}
