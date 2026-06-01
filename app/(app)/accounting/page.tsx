import Link from "next/link";
import { getAuthContext } from "@/lib/auth/require-role";
import { TrendingUp, TrendingDown, BarChart3, Percent, Receipt, Landmark, PiggyBank, Info } from "lucide-react";
import { getRecipeBook, getPurchasesRegister, getAccountingStats } from "@/lib/db/queries/accounting";
import { getTreasuryState } from "@/lib/db/queries/treasury";
import { formatCurrency } from "@/lib/utils";
import { CHANNELS } from "@/lib/data";
import AccountingTabs from "@/components/accounting/accounting-tabs";
import TreasurySection from "@/components/accounting/treasury-section";

export const revalidate = 30;

export default async function AccountingPage({ searchParams }: { searchParams: Promise<{ year?: string; tab?: string }> }) {
  const sp = await searchParams;
  // SASU MaisonRoseLin : exercice fiscal 2026 uniquement.
  const year = sp.year ? parseInt(sp.year, 10) : 2026;
  const tab = sp.tab ?? "recipes";
  const { shopId } = await getAuthContext();

  const [recipes, purchasesRows, stats, treasury] = await Promise.all([
    getRecipeBook(shopId, year),
    getPurchasesRegister(shopId, year),
    getAccountingStats(shopId, year),
    getTreasuryState(shopId),
  ]);

  const yearOptions = [2026];

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Comptabilite</h1>
          <p className="text-zinc-500 mt-1 text-sm">Regime SASU — comptabilite d'engagement, TVA 20%, IS sur les benefices</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-300 text-[11px] font-semibold uppercase tracking-wider">
          SASU · Exercice {year}
        </span>
      </div>

      {/* TRESORERIE (operationnel) */}
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
      />

      {/* COMPTABILITE FISCALE */}
      <div className="pt-2 border-t border-[var(--color-border-subtle)]">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mt-4 mb-3">
          Compte de resultat — Exercice {year}
        </p>
      </div>

      {/* Selecteur annee (un seul choix actuellement) */}
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

      {/* KPIs cle du compte de resultat */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">CA HT</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><TrendingUp size={15} className="text-emerald-400" /></div>
          </div>
          <div className="mt-auto">
            <p className="text-[22px] font-bold text-white tabular-nums">{formatCurrency(stats.revenueHT)}</p>
            <p className="text-[11px] text-zinc-500">{stats.salesCount} vente{stats.salesCount > 1 ? "s" : ""} · {formatCurrency(stats.revenueTTC)} TTC</p>
          </div>
        </div>

        <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Charges HT</p>
            <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center"><TrendingDown size={15} className="text-red-400" /></div>
          </div>
          <div className="mt-auto">
            <p className="text-[22px] font-bold text-white tabular-nums">{formatCurrency(stats.expensesHT)}</p>
            <p className="text-[11px] text-zinc-500">{stats.expensesCount} ligne{stats.expensesCount > 1 ? "s" : ""} · {formatCurrency(stats.expensesTTC)} TTC</p>
          </div>
        </div>

        <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Resultat avant IS</p>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${stats.resultBeforeTax >= 0 ? "bg-emerald-500/10" : "bg-red-500/10"}`}>
              <BarChart3 size={15} className={stats.resultBeforeTax >= 0 ? "text-emerald-400" : "text-red-400"} />
            </div>
          </div>
          <div className="mt-auto">
            <p className={`text-[22px] font-bold tabular-nums ${stats.resultBeforeTax >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatCurrency(stats.resultBeforeTax)}
            </p>
            <p className="text-[11px] text-zinc-500">Marge nette {stats.marginPct.toFixed(1)}%</p>
          </div>
        </div>

        <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Resultat net</p>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center"><Percent size={15} className="text-rose-400" /></div>
          </div>
          <div className="mt-auto">
            <p className={`text-[22px] font-bold tabular-nums ${stats.netResult >= 0 ? "text-white" : "text-red-400"}`}>
              {formatCurrency(stats.netResult)}
            </p>
            <p className="text-[11px] text-zinc-500">apres IS {formatCurrency(stats.corporateTax)}</p>
          </div>
        </div>
      </div>

      {/* COMPTE DE RESULTAT SIMPLIFIE */}
      <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center gap-2">
          <BarChart3 size={15} className="text-rose-400" />
          <p className="text-[13px] font-semibold text-white">Compte de resultat simplifie</p>
        </div>
        <div className="p-5 space-y-2.5 text-[13px]">
          <ResultRow label="Chiffre d'affaires HT" value={stats.revenueHT} />
          <ResultRow label="Achats et charges HT" value={-stats.expensesHT} />
          <Divider />
          <ResultRow label="Resultat avant impot" value={stats.resultBeforeTax} bold accent={stats.resultBeforeTax >= 0 ? "emerald" : "red"} />
          <ResultRow label={`Impot sur les societes (15% jusqu'a 42 500 EUR, 25% au-dela)`} value={-stats.corporateTax} muted />
          <Divider />
          <ResultRow label="Resultat net" value={stats.netResult} bold accent={stats.netResult >= 0 ? "emerald" : "red"} big />
        </div>
      </div>

      {/* TVA + IS + DIVIDENDES — 3 cartes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* TVA */}
        <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Receipt size={14} className="text-amber-400" />
            <p className="text-[12px] font-semibold text-white uppercase tracking-wider">TVA</p>
          </div>
          <div className="space-y-1.5 text-[12px] flex-1">
            <SmallRow label="Collectee (ventes)" value={stats.vatCollected} />
            <SmallRow label="Deductible (achats)" value={-stats.vatDeductible} />
            <div className="h-px bg-[var(--color-border-subtle)] my-2" />
            <SmallRow label="A reverser au Tresor" value={stats.vatToPay} bold accent="amber" />
          </div>
          <p className="text-[10px] text-zinc-500 mt-3">CA12 annuelle ou CA3 mensuelle selon ton regime.</p>
        </div>

        {/* IS */}
        <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Landmark size={14} className="text-rose-400" />
            <p className="text-[12px] font-semibold text-white uppercase tracking-wider">Impot societes</p>
          </div>
          <div className="space-y-1.5 text-[12px] flex-1">
            <SmallRow label="Resultat fiscal" value={stats.resultBeforeTax} />
            <SmallRow label="Taux reduit 15% (≤42 500 EUR)" value={Math.min(stats.resultBeforeTax, 42500) > 0 ? Math.min(stats.resultBeforeTax, 42500) * 0.15 : 0} muted />
            <SmallRow label="Taux normal 25%" value={stats.resultBeforeTax > 42500 ? (stats.resultBeforeTax - 42500) * 0.25 : 0} muted />
            <div className="h-px bg-[var(--color-border-subtle)] my-2" />
            <SmallRow label="IS du" value={stats.corporateTax} bold accent="rose" />
          </div>
          <p className="text-[10px] text-zinc-500 mt-3">Paiement par acomptes trimestriels + solde au 15 mai N+1.</p>
        </div>

        {/* Dividendes potentiels */}
        <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <PiggyBank size={14} className="text-emerald-400" />
            <p className="text-[12px] font-semibold text-white uppercase tracking-wider">Dividendes potentiels</p>
          </div>
          <div className="space-y-1.5 text-[12px] flex-1">
            <SmallRow label="Resultat distribuable" value={stats.netResult} />
            <SmallRow label="Flat tax 30% (PFU)" value={-stats.flatTaxAmount} muted />
            <div className="h-px bg-[var(--color-border-subtle)] my-2" />
            <SmallRow label="Net en poche" value={stats.netDividendsIfDistributed} bold accent="emerald" />
          </div>
          <p className="text-[10px] text-zinc-500 mt-3">Si distribution totale du resultat. Decide en AG apres cloture.</p>
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
          amountTTC: r.amountTTC,
          amountHT: r.amountHT,
          vat: r.vat,
          paymentMethod: r.paymentMethod,
        }))}
        purchases={purchasesRows.map((p) => ({
          id: p.id,
          date: p.date ? p.date.toISOString() : null,
          description: p.description,
          supplier: p.supplier,
          amountTTC: p.amountTTC,
          amountHT: p.amountHT,
          vat: p.vat,
          vatDeductible: p.vatDeductible,
          category: p.category,
          paymentMethod: p.paymentMethod,
          productSku: p.productSku,
        }))}
      />

      <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-[14px] flex gap-3">
        <Info size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-[12px] text-zinc-400 space-y-1">
          <p><strong className="text-zinc-200">Rappel SASU :</strong> compta d'engagement obligatoire (date facture, pas date paiement). Liasse fiscale a deposer dans les 3 mois de la cloture (ou 4 mois si exercice cale au 31/12).</p>
          <p>TVA non deductible sur les achats a particuliers (Vinted, etc.) — la colonne TVA ded. est ignoree dans ce cas. Verifie avec un expert-comptable si tu peux appliquer la <strong>TVA sur la marge</strong> (art. 297 A CGI) pour les biens d'occasion : ca peut etre plus avantageux.</p>
          <p>Registres a conserver 10 ans. Export Excel disponible pour ton EC.</p>
        </div>
      </div>
      <div className="pb-8" />
    </div>
  );
}

function ResultRow({ label, value, bold, big, muted, accent }: { label: string; value: number; bold?: boolean; big?: boolean; muted?: boolean; accent?: "emerald" | "red" | "amber" | "rose" }) {
  const colorClass =
    accent === "emerald" ? "text-emerald-400" :
    accent === "red" ? "text-red-400" :
    accent === "amber" ? "text-amber-400" :
    accent === "rose" ? "text-rose-400" :
    muted ? "text-zinc-500" : "text-zinc-200";
  return (
    <div className="flex items-center justify-between">
      <span className={`${bold ? "font-semibold text-white" : muted ? "text-zinc-500" : "text-zinc-400"} ${big ? "text-[15px]" : ""}`}>{label}</span>
      <span className={`tabular-nums ${big ? "text-[18px] font-bold" : bold ? "font-semibold" : ""} ${colorClass}`}>
        {value >= 0 ? "" : "-"}{formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}

function Divider() {
  return <div className="h-px bg-[var(--color-border-subtle)] my-1" />;
}

function SmallRow({ label, value, bold, muted, accent }: { label: string; value: number; bold?: boolean; muted?: boolean; accent?: "emerald" | "red" | "amber" | "rose" }) {
  const colorClass =
    accent === "emerald" ? "text-emerald-400" :
    accent === "red" ? "text-red-400" :
    accent === "amber" ? "text-amber-400" :
    accent === "rose" ? "text-rose-400" :
    muted ? "text-zinc-500" : "text-zinc-300";
  return (
    <div className="flex items-center justify-between">
      <span className={muted ? "text-zinc-500" : bold ? "text-white font-semibold" : "text-zinc-400"}>{label}</span>
      <span className={`tabular-nums ${bold ? "font-bold text-[13px]" : ""} ${colorClass}`}>
        {value >= 0 ? "" : "-"}{formatCurrency(Math.abs(value))}
      </span>
    </div>
  );
}
