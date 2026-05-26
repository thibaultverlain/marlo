import Link from "next/link";
import { getAuthContext } from "@/lib/auth/require-role";
import { TrendingUp, TrendingDown, BarChart3, Percent } from "lucide-react";
import { getRecipeBook, getPurchasesRegister, getAccountingStats } from "@/lib/db/queries/accounting";
import { formatCurrency } from "@/lib/utils";
import { CHANNELS } from "@/lib/data";
import AccountingTabs from "@/components/accounting/accounting-tabs";

export const revalidate = 30;

export default async function AccountingPage({ searchParams }: { searchParams: Promise<{ year?: string; tab?: string }> }) {
  const sp = await searchParams;
  const year = sp.year ? parseInt(sp.year, 10) : new Date().getFullYear();
  const tab = sp.tab ?? "recipes";
  const { shopId } = await getAuthContext();

  const [recipes, purchasesRows, stats, prevStats] = await Promise.all([
    getRecipeBook(shopId, year),
    getPurchasesRegister(shopId, year),
    getAccountingStats(shopId, year),
    getAccountingStats(shopId, year - 1),
  ]);

  const benefit = stats.revenue - stats.expenses;
  const prevBenefit = prevStats.revenue - prevStats.expenses;
  const marginPct = stats.revenue > 0 ? (benefit / stats.revenue) * 100 : 0;

  const revenueEvolution = prevStats.revenue > 0
    ? ((stats.revenue - prevStats.revenue) / prevStats.revenue) * 100
    : null;
  const benefitEvolution = prevBenefit > 0
    ? ((benefit - prevBenefit) / prevBenefit) * 100
    : null;

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 3, currentYear - 2, currentYear - 1, currentYear];

  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Comptabilite</h1>
        <p className="text-zinc-500 mt-1 text-sm">Livre de recettes et registre des achats</p>
      </div>

      {/* Selecteur annee */}
      <div className="flex bg-zinc-800/60 rounded-lg p-0.5 w-fit overflow-x-auto">
        {yearOptions.map((y) => (
          <Link
            key={y}
            href={`/accounting?year=${y}${tab !== "recipes" ? `&tab=${tab}` : ""}`}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all whitespace-nowrap ${
              year === y
                ? "bg-[var(--color-accent-muted)] text-rose-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {y}
          </Link>
        ))}
      </div>

      {/* KPIs avec icones */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Recettes</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><TrendingUp size={15} className="text-emerald-400" /></div>
          </div>
          <div className="mt-auto">
            <p className="text-[22px] font-bold text-white tabular-nums">{formatCurrency(stats.revenue)}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-[11px] text-zinc-500">{stats.salesCount} vente{stats.salesCount > 1 ? "s" : ""}</p>
              {revenueEvolution !== null && (
                <span className={`text-[10px] font-medium ${revenueEvolution >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {revenueEvolution >= 0 ? "+" : ""}{revenueEvolution.toFixed(0)}% vs {year - 1}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Depenses</p>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center"><TrendingDown size={15} className="text-red-400" /></div>
          </div>
          <div className="mt-auto">
            <p className="text-[22px] font-bold text-white tabular-nums">{formatCurrency(stats.expenses)}</p>
            <p className="text-[11px] text-zinc-500">{stats.expensesCount} ligne{stats.expensesCount > 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Resultat</p>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${benefit >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
              <BarChart3 size={15} className={benefit >= 0 ? "text-emerald-400" : "text-red-400"} />
            </div>
          </div>
          <div className="mt-auto">
            <p className={`text-[22px] font-bold tabular-nums ${benefit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatCurrency(benefit)}
            </p>
            {benefitEvolution !== null && (
              <span className={`text-[10px] font-medium ${benefitEvolution >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {benefitEvolution >= 0 ? "+" : ""}{benefitEvolution.toFixed(0)}% vs {year - 1}
              </span>
            )}
          </div>
        </div>

        <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Marge nette</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Percent size={15} className="text-emerald-400" /></div>
          </div>
          <p className={`text-[22px] font-bold tabular-nums mt-auto ${marginPct >= 0 ? "text-white" : "text-red-400"}`}>
            {marginPct.toFixed(1)}%
          </p>
        </div>
      </div>

      <AccountingTabs
        year={year}
        activeTab={tab}
        recipes={recipes.map((r) => ({
          date: r.date.toISOString(),
          invoiceNumber: r.invoiceNumber,
          customerName: r.customerName,
          productTitle: r.productTitle,
          channel: r.channel,
          channelLabel: CHANNELS.find((c) => c.value === r.channel)?.label ?? r.channel,
          amount: r.amount,
          paymentMethod: r.paymentMethod,
        }))}
        purchases={purchasesRows.map((p) => ({
          id: p.id,
          date: p.date ? p.date.toISOString() : null,
          description: p.description,
          supplier: p.supplier,
          amount: p.amount,
          category: p.category,
          paymentMethod: p.paymentMethod,
          productSku: p.productSku,
        }))}
      />

      <div className="p-4 bg-zinc-800/50 rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)]">
        <p className="text-[11px] text-zinc-500">
          <strong className="text-zinc-400">Rappel :</strong> Registres a conserver 10 ans. Export Excel pour tes declarations. Consulte un expert-comptable.
        </p>
      </div>
      <div className="pb-8" />
    </div>
  );
}
