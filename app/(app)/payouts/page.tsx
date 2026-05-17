import { getAuthContext } from "@/lib/auth/require-role";
import { getPayouts, getPayoutStats } from "@/lib/db/queries/payouts";
import PayoutsPageClient from "@/components/payouts/payouts-page-client";
export const revalidate = 30;

export default async function PayoutsPage() {
  const ctx = await getAuthContext();
  const [payouts, stats] = await Promise.all([
    getPayouts(ctx.shopId),
    getPayoutStats(ctx.shopId),
  ]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 page-enter">
      <PayoutsPageClient payouts={payouts} stats={stats} />
    </div>
  );
}
