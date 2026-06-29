import { notFound } from "next/navigation";
import { getAuthContext } from "@/lib/auth/require-role";
import { getOrderDetail } from "@/lib/db/queries/orders";
import OrderDetailClient from "@/components/orders/order-detail-client";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await getAuthContext();
  const order = await getOrderDetail(ctx.shopId, id);
  if (!order) notFound();

  return (
    <div className="space-y-6 page-enter">
      <OrderDetailClient order={order} />
    </div>
  );
}
