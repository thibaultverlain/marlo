import Link from "next/link";
import { getAuthContext } from "@/lib/auth/require-role";
import { TrendingUp, TrendingDown, Landmark, Percent, Info, Wallet, AlertTriangle } from "lucide-react";
import {
  getRecipeBook,
  getPurchasesRegister,
  getAccountingStats,
  MICRO,
} from "@/lib/db/queries/accounting";
import { getTreasuryState } from "@/lib/db/queries/treasury";
import { formatCurrency } from "@/lib/utils";
import { CHANNELS } from "@/lib/data";
import AccountingTabs from "@/components/accounting/accounting-tabs";
import TreasurySection from "@/components/accounting/treasury-section";

export const revalidate = 30;

export default async function AccountingPage({ searchParams }: { searchParams: Promise<{ year?: string; tab?: string }> }) {
  const sp = await searchParams;
  const year = sp.year ? parseInt(sp.year, 10) : new Date().getFullYear();
  const tab = sp.tab ?? "recipes";
  const { shopId } = await getAuthContext();

  const [recipes, purchasesRows, stats, treasury] = await Promise.all([
    getRecipeBook(shopId, year),
    getPurchasesRegister(shopId, year),
    getAccountingStats(shopId, year),
    getTreasuryState(shopId),
  ]);

  const yearOptions = [year - 1, year, year + 1].filter((y, i, arr) => arr.indexOf(y) === i);

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Comptabilite</h1>
          <p className="text-zinc-500 mt-1 text-sm">Regime micro-entreprise — vente de biens, franchise TVA.</p>
        </div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-rose-500/10 text-rose-300 text-[11px] font-semibold uppercase tracking-wider">
          Micro-BIC · Exercice {year}
        </span>
      </div>

      {/* TRESORERIE */}
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

      {/* SECTION FISCALE */}
      <div className="pt-2 border-t border-[var(--color-border-subtle)]">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mt-4 mb-3">
          Regime fiscal — Exercice {year}
        </p>
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

      {/* KPIs micro */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">CA encaisse</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><TrendingUp size={15} className="text-emerald-400" /></div>
          </div>
          <div className="mt-auto">
            <p className="text-[22px] font-bold text-white tabular-nums">{formatCurrency(stats.revenue)}</p>
            <p className="text-[11px] text-zinc-500">{stats.salesCount} vente{stats.salesCount > 1 ? "s" : ""} encaissee{stats.salesCount > 1 ? "s" : ""}</p>
          </div>
        </div>

        <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Cotisations URSSAF</p>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center"><Landmark size={15} className="text-amber-400" /></div>
          </div>
          <div className="mt-auto">
            <p className="text-[22px] font-bold text-white tabular-nums">{formatCurrency(stats.urssafDue)}</p>
            <p className="text-[11px] text-zinc-500">{(MICRO.URSSAF_RATE * 100).toFixed(1)}% du CA</p>
          </div>
        </div>

        <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">IR (VFL 1%)</p>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center"><Percent size={15} className="text-rose-400" /></div>
          </div>
          <div className="mt-auto">
            <p className="text-[22px] font-bold text-white tabular-nums">{formatCurrency(stats.incomeTaxVfl)}</p>
            <p className="text-[11px] text-zinc-500">Option versement liberatoire</p>
          </div>
        </div>

        <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Net en poche</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Wallet size={15} className="text-emerald-400" /></div>
          </div>
          <div className="mt-auto">
            <p className={`text-[22px] font-bold tabular-nums ${stats.netAfterAll >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {formatCurrency(stats.netAfterAll)}
            </p>
            <p className="text-[11px] text-zinc-500">apres URSSAF + IR</p>
          </div>
        </div>
      </div>

      {/* Compte de resultat simplifie micro */}
      <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--color-border)] flex items-center gap-2">
          <TrendingDown size={15} className="text-rose-400 rotate-180" />
          <p className="text-[13px] font-semibold text-white">Ce qu'il te reste vraiment</p>
        </div>
        <div className="p-5 space-y-2.5 text-[13px]">
          <ResultRow label="CA encaisse" value={stats.revenue} />
          <ResultRow label={`Cotisations URSSAF (${(MICRO.URSSAF_RATE * 100).toFixed(1)}%)`} value={-stats.urssafDue} muted />
          <ResultRow label={`Contribution formation pro (${(MICRO.CFP_RATE * 100).toFixed(1)}%)`} value={-stats.cfpDue} muted />
          <Divider />
          <ResultRow label="Net apres charges sociales" value={stats.netAfterSocial} bold accent={stats.netAfterSocial >= 0 ? "emerald" : "red"} />
          <ResultRow label="Impot sur le revenu (VFL 1%)" value={-stats.incomeTaxVfl} muted />
          <Divider />
          <ResultRow label="Net final en poche" value={stats.netAfterAll} bold accent={stats.netAfterAll >= 0 ? "emerald" : "red"} big />
        </div>
      </div>

      {/* Cartes plafonds + regime alternatif */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Plafond franchise TVA */}
        <div className={`bg-[var(--color-bg-card)] rounded-[14px] border shadow-[var(--shadow-card)] p-5 flex flex-col ${
          stats.vatWarning === "over" ? "border-red-500/40" : stats.vatWarning === "warning" ? "border-amber-500/40" : "border-[var(--color-border)]"
        }`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className={stats.vatWarning === "over" ? "text-red-400" : stats.vatWarning === "warning" ? "text-amber-400" : "text-emerald-400"} />
            <p className="text-[12px] font-semibold text-white uppercase tracking-wider">Plafond franchise TVA</p>
          </div>
          <div className="space-y-1.5 text-[12px] flex-1">
            <SmallRow label="CA de l'annee" value={stats.revenue} />
            <SmallRow label={`Plafond ${MICRO.VAT_THRESHOLD.toLocaleString("fr-FR")} EUR`} value={MICRO.VAT_THRESHOLD} muted />
            <div className="h-px bg-[var(--color-border-subtle)] my-2" />
            <SmallRow label="Marge restante" value={stats.vatRemainingBudget} bold accent={stats.vatWarning === "over" ? "red" : stats.vatWarning === "warning" ? "amber" : "emerald"} />
          </div>
          <div className="mt-3">
            <div className="relative h-1.5 bg-zinc-800/60 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${stats.vatUsagePct}%`,
                  background: stats.vatWarning === "over"
                    ? "linear-gradient(90deg, #ef4444, #f87171)"
                    : stats.vatWarning === "warning"
                    ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
                    : "linear-gradient(90deg, var(--color-accent), var(--color-accent-hover))",
                }}
              />
            </div>
            <p className="text-[10px] text-zinc-500 mt-2 leading-relaxed">
              {stats.vatWarning === "over"
                ? <span className="text-red-300 font-semibold">Plafond depasse — TVA a facturer immediatement.</span>
                : stats.vatWarning === "warning"
                ? <span className="text-amber-300 font-semibold">Attention : {stats.vatUsagePct.toFixed(0)}% du plafond utilise.</span>
                : `${stats.vatUsagePct.toFixed(1)}% du plafond utilise. Marge confortable.`}
            </p>
          </div>
        </div>

        {/* Regime alternatif : bareme progressif */}
        <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <Percent size={14} className="text-rose-400" />
            <p className="text-[12px] font-semibold text-white uppercase tracking-wider">Si bareme IR classique</p>
          </div>
          <div className="space-y-1.5 text-[12px] flex-1">
            <SmallRow label="CA encaisse" value={stats.revenue} />
            <SmallRow label={`Abattement ${(MICRO.DEDUCTION_RATE * 100).toFixed(0)}%`} value={-stats.revenue * MICRO.DEDUCTION_RATE} muted />
            <div className="h-px bg-[var(--color-border-subtle)] my-2" />
            <SmallRow label="Base imposable" value={stats.taxableBaseIfBareme} bold accent="rose" />
          </div>
          <p className="text-[10px] text-zinc-500 mt-3">Sans option VFL, cette base rentre dans ton IR avec les autres revenus (bareme progressif).</p>
        </div>

        {/* Plafond micro global */}
        <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-5 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp size={14} className="text-emerald-400" />
            <p className="text-[12px] font-semibold text-white uppercase tracking-wider">Plafond micro global</p>
          </div>
          <div className="space-y-1.5 text-[12px] flex-1">
            <SmallRow label="CA de l'annee" value={stats.revenue} />
            <SmallRow label={`Plafond ${MICRO.MICRO_CEILING.toLocaleString("fr-FR")} EUR`} value={MICRO.MICRO_CEILING} muted />
            <div className="h-px bg-[var(--color-border-subtle)] my-2" />
            <SmallRow label="% utilise" value={stats.ceilingUsagePct} muted />
          </div>
          <p className="text-[10px] text-zinc-500 mt-3">Au-dela, sortie automatique du regime micro (passage au reel).</p>
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

      <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-[14px] flex gap-3">
        <Info size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
        <div className="text-[12px] text-zinc-400 space-y-1">
          <p><strong className="text-zinc-200">Rappel micro-entreprise (vente de biens) :</strong> compta d'ENCAISSEMENT (date du paiement recu, pas de la vente). Franchise en base de TVA — tu ne factures ni ne recuperes de TVA tant que le CA est sous {MICRO.VAT_THRESHOLD.toLocaleString("fr-FR")} EUR.</p>
          <p>Cotisations sociales : {(MICRO.URSSAF_RATE * 100).toFixed(1)}% du CA (URSSAF) + {(MICRO.CFP_RATE * 100).toFixed(1)}% formation. Impot sur le revenu : option VFL 1% du CA OU integration au bareme progressif apres abattement {(MICRO.DEDUCTION_RATE * 100).toFixed(0)}%.</p>
          <p>Registre des achats a conserver 10 ans. Les taux peuvent evoluer — verifie avec ton expert-comptable.</p>
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
