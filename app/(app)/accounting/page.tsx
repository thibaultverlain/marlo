import { getAuthContext } from "@/lib/auth/require-role";
import { getTreasuryState } from "@/lib/db/queries/treasury";
import TreasurySection from "@/components/accounting/treasury-section";

export const revalidate = 30;

export default async function AccountingPage() {
  const { shopId } = await getAuthContext();
  const treasury = await getTreasuryState(shopId);

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Comptabilite</h1>
        <p className="text-zinc-500 mt-1 text-sm">Tresorerie operationnelle en temps reel.</p>
      </div>

      <TreasurySection
        cashBalance={treasury.cashBalance}
        cashUpdatedAt={treasury.cashUpdatedAt}
        pendingPayouts={treasury.pendingPayouts}
        pendingTotal={treasury.pendingTotal}
        stockValue={treasury.stockValue}
        capitalTotal={treasury.capitalTotal}
        lockedRatio={treasury.lockedRatio}
        stopBuying={treasury.stopBuying}
        buyingBudget={treasury.buyingBudget}
        buyingThreshold={treasury.buyingThreshold}
        movements={treasury.movements}
        monthApports={treasury.monthApports}
        monthPrelevements={treasury.monthPrelevements}
      />
    </div>
  );
}
