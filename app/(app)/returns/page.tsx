import { getAuthContext } from "@/lib/auth/require-role";
import { getReturns } from "@/lib/db/queries/returns";
import { getAllSales } from "@/lib/db/queries/sales";
import ReturnsPageClient from "@/components/returns/returns-page-client";
export const revalidate = 30;

export default async function ReturnsPage() {
  const ctx = await getAuthContext();
  const [returns, sales] = await Promise.all([
    getReturns(ctx.shopId),
    getAllSales(ctx.shopId),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 page-enter">
      <ReturnsPageClient returns={returns} sales={sales} />
    </div>
  );
}
