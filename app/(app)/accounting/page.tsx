import Link from "next/link";
import { Download, BookOpen, Receipt, TrendingUp, TrendingDown } from "lucide-react";
import { getRecipeBook, getPurchasesRegister, getAccountingStats } from "@/lib/db/queries/accounting";
import { formatCurrency, formatDate } from "@/lib/utils";
import { CHANNELS } from "@/lib/data";
import AccountingTabs from "@/components/accounting/accounting-tabs";

export const dynamic = "force-dynamic";

export default async function AccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; tab?: string }>;
}) {
  const sp = await searchParams;
  const year = sp.year ? parseInt(sp.year, 10) : new Date().getFullYear();
  const tab = sp.tab ?? "recipes";

  const [recipes, purchasesRows, stats] = await Promise.all([
    getRecipeBook(year),
    getPurchasesRegister(year),
    getAccountingStats(year),
  ]);

  const benefit = stats.revenue - stats.expenses;

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 2, currentYear - 1, currentYear];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-stone-900">Comptabilité</h1>
          <p className="text-stone-400 mt-1">Livre de recettes et registre des achats</p>
        </div>

        <form>
          <select
            name="year"
            defaultValue={String(year)}
            className="text-sm bg-white border border-stone-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>Année {y}</option>
            ))}
          </select>
          <button type="submit" className="ml-2 px-3 py-2.5 text-sm text-stone-600 hover:text-stone-900">
            Afficher
          </button>
        </form>
      </div>

      {/* Year stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-stone-200/60 p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-green-600" />
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Recettes {year}</p>
          </div>
          <p className="text-2xl font-semibold text-stone-900">{formatCurrency(stats.revenue)}</p>
          <p className="text-xs text-stone-400 mt-0.5">{stats.salesCount} vente{stats.salesCount > 1 ? "s" : ""}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200/60 p-5">
          <div className="flex items-center gap-2 mb-1">
            <TrendingDown size={14} className="text-red-500" />
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Dépenses {year}</p>
          </div>
          <p className="text-2xl font-semibold text-stone-900">{formatCurrency(stats.expenses)}</p>
          <p className="text-xs text-stone-400 mt-0.5">{stats.expensesCount} achat{stats.expensesCount > 1 ? "s" : ""}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200/60 p-5">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Résultat brut</p>
          <p className={`text-2xl font-semibold ${benefit >= 0 ? "text-green-700" : "text-red-600"}`}>
            {formatCurrency(benefit)}
          </p>
          <p className="text-xs text-stone-400 mt-0.5">Recettes − Dépenses</p>
        </div>
      </div>

      {/* Tabs and content */}
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

      <div className="p-4 bg-stone-50 rounded-xl border border-stone-200/60">
        <p className="text-xs text-stone-500">
          <strong>Rappel légal :</strong> Ces registres doivent être conservés pendant 10 ans.
          L'export CSV t'aide à préparer tes déclarations URSSAF et impôts, mais il ne remplace pas une
          tenue comptable professionnelle si ton activité l'exige. Consulte un expert-comptable.
        </p>
      </div>

      <div className="pb-8" />
    </div>
  );
}
