import { TrendingUp, TrendingDown } from "lucide-react";
import { getRecipeBook, getPurchasesRegister, getAccountingStats } from "@/lib/db/queries/accounting";
import { formatCurrency } from "@/lib/utils";
import { CHANNELS } from "@/lib/data";
import AccountingTabs from "@/components/accounting/accounting-tabs";
export const dynamic = "force-dynamic";

export default async function AccountingPage({ searchParams }: { searchParams: Promise<{ year?: string; tab?: string }> }) {
  const sp = await searchParams;
  const year = sp.year ? parseInt(sp.year, 10) : new Date().getFullYear();
  const tab = sp.tab ?? "recipes";
  const [recipes, purchasesRows, stats] = await Promise.all([getRecipeBook(year), getPurchasesRegister(year), getAccountingStats(year)]);
  const benefit = stats.revenue - stats.expenses;
  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl lg:text-3xl text-white">Comptabilité</h1><p className="text-zinc-500 mt-1 text-sm">Livre de recettes et registre des achats</p></div>
        <form><select name="year" defaultValue={String(year)} className="text-[13px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-zinc-300 focus:outline-none focus:ring-1 focus:ring-indigo-500/50">{[currentYear-2,currentYear-1,currentYear].map((y)=><option key={y} value={y}>Année {y}</option>)}</select><button type="submit" className="ml-2 px-3 py-2 text-sm text-zinc-500 hover:text-zinc-300">Afficher</button></form>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5"><div className="flex items-center gap-2 mb-1"><TrendingUp size={14} className="text-emerald-400" /><p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Recettes {year}</p></div><p className="text-2xl font-semibold text-white tabular-nums">{formatCurrency(stats.revenue)}</p><p className="text-[11px] text-zinc-600 mt-0.5">{stats.salesCount} vente{stats.salesCount>1?"s":""}</p></div>
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5"><div className="flex items-center gap-2 mb-1"><TrendingDown size={14} className="text-red-400" /><p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Dépenses {year}</p></div><p className="text-2xl font-semibold text-white tabular-nums">{formatCurrency(stats.expenses)}</p></div>
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5"><p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Résultat brut</p><p className={`text-2xl font-semibold tabular-nums ${benefit>=0?"text-emerald-400":"text-red-400"}`}>{formatCurrency(benefit)}</p></div>
      </div>
      <AccountingTabs year={year} activeTab={tab} recipes={recipes.map((r)=>({date:r.date.toISOString(),invoiceNumber:r.invoiceNumber,customerName:r.customerName,productTitle:r.productTitle,channel:r.channel,channelLabel:CHANNELS.find((c)=>c.value===r.channel)?.label??r.channel,amount:r.amount,paymentMethod:r.paymentMethod}))} purchases={purchasesRows.map((p)=>({id:p.id,date:p.date?p.date.toISOString():null,description:p.description,supplier:p.supplier,amount:p.amount,category:p.category,paymentMethod:p.paymentMethod,productSku:p.productSku}))} />
      <div className="p-4 bg-zinc-800/50 rounded-xl border border-[var(--color-border)]"><p className="text-[11px] text-zinc-500"><strong className="text-zinc-400">Rappel :</strong> Registres à conserver 10 ans. Export CSV pour tes déclarations. Consulte un expert-comptable.</p></div>
      <div className="pb-8" />
    </div>
  );
}
