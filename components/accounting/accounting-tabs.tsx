"use client";

import { useState, useMemo } from "react";
import { BookOpen, Receipt, FileSpreadsheet } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type RecipeEntry = {
  date: string;
  invoiceNumber: string | null;
  customerName: string | null;
  productTitle: string | null;
  channel: string;
  channelLabel: string;
  amountTTC: number;
  amountHT: number;
  vat: number;
  paymentMethod: string | null;
};

type PurchaseEntry = {
  id: string;
  date: string | null;
  description: string;
  supplier: string | null;
  amountTTC: number;
  amountHT: number;
  vat: number;
  vatDeductible: boolean;
  category: string | null;
  paymentMethod: string | null;
  productSku: string | null;
};

const PERIODS = [
  { value: "all", label: "Annee complete" },
  { value: "T1", label: "T1" },
  { value: "T2", label: "T2" },
  { value: "T3", label: "T3" },
  { value: "T4", label: "T4" },
];

const MONTHS = ["Janv", "Fev", "Mars", "Avril", "Mai", "Juin", "Juil", "Aout", "Sept", "Oct", "Nov", "Dec"];

function inPeriod(d: string | null, period: string): boolean {
  if (!d || period === "all") return true;
  const month = new Date(d).getMonth();
  if (period === "T1") return month >= 0 && month <= 2;
  if (period === "T2") return month >= 3 && month <= 5;
  if (period === "T3") return month >= 6 && month <= 8;
  if (period === "T4") return month >= 9 && month <= 11;
  return month === parseInt(period, 10);
}

export default function AccountingTabs({
  year,
  activeTab,
  recipes,
  purchases,
}: {
  year: number;
  activeTab: string;
  recipes: RecipeEntry[];
  purchases: PurchaseEntry[];
}) {
  const [tab, setTab] = useState<"recipes" | "purchases">(activeTab === "purchases" ? "purchases" : "recipes");
  const [period, setPeriod] = useState<string>("all");

  const filteredRecipes = useMemo(() => recipes.filter((r) => inPeriod(r.date, period)), [recipes, period]);
  const filteredPurchases = useMemo(() => purchases.filter((p) => inPeriod(p.date, period)), [purchases, period]);

  const totalRecipesHT = filteredRecipes.reduce((s, r) => s + r.amountHT, 0);
  const totalRecipesVAT = filteredRecipes.reduce((s, r) => s + r.vat, 0);
  const totalRecipesTTC = filteredRecipes.reduce((s, r) => s + r.amountTTC, 0);

  const totalPurchasesHT = filteredPurchases.reduce((s, p) => s + p.amountHT, 0);
  const totalPurchasesVAT = filteredPurchases.reduce((s, p) => s + p.vat, 0);
  const totalPurchasesTTC = filteredPurchases.reduce((s, p) => s + p.amountTTC, 0);

  // Monthly chart data (en HT, base comptable SASU)
  const monthlyData = useMemo(() => {
    const data: { month: string; recipes: number; purchases: number }[] = MONTHS.map((m) => ({
      month: m, recipes: 0, purchases: 0,
    }));
    recipes.forEach((r) => {
      if (r.date) {
        const m = new Date(r.date).getMonth();
        data[m].recipes += r.amountHT;
      }
    });
    purchases.forEach((p) => {
      if (p.date) {
        const m = new Date(p.date).getMonth();
        data[m].purchases += p.amountHT;
      }
    });
    return data;
  }, [recipes, purchases]);

  const maxValue = Math.max(...monthlyData.map((d) => Math.max(d.recipes, d.purchases)), 1);

  return (
    <div className="space-y-4">
      {/* Mini evolution chart */}
      {(recipes.length > 0 || purchases.length > 0) && (
        <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[13px] font-semibold text-white">Evolution mensuelle (HT)</p>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-400/60" />
                <span className="text-zinc-500">Produits HT</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-red-400/50" />
                <span className="text-zinc-500">Charges HT</span>
              </span>
            </div>
          </div>
          <div className="flex items-end gap-1.5 h-[120px]">
            {monthlyData.map((m, i) => {
              const isCurrentMonth = i === new Date().getMonth() && year === new Date().getFullYear();
              return (
                <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5 group relative">
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded px-2 py-1 text-[10px] z-10 shadow-lg">
                    <p className="text-emerald-400">Produits : {formatCurrency(m.recipes)} HT</p>
                    <p className="text-red-400">Charges : {formatCurrency(m.purchases)} HT</p>
                  </div>
                  <div className="w-full flex items-end gap-px h-[90px]">
                    <div
                      className="flex-1 bg-emerald-400/60 hover:bg-emerald-400/80 transition-colors rounded-sm"
                      style={{ height: `${(m.recipes / maxValue) * 100}%` }}
                    />
                    <div
                      className="flex-1 bg-red-400/50 hover:bg-red-400/70 transition-colors rounded-sm"
                      style={{ height: `${(m.purchases / maxValue) * 100}%` }}
                    />
                  </div>
                  <span className={`text-[9px] ${isCurrentMonth ? "text-rose-400 font-semibold" : "text-zinc-500"}`}>{m.month}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Period filter */}
      <div className="flex bg-zinc-800/60 rounded-lg p-0.5 w-fit overflow-x-auto">
        {PERIODS.map((p) => (
          <button
            key={p.value}
            onClick={() => setPeriod(p.value)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all whitespace-nowrap ${
              period === p.value
                ? "bg-[var(--color-accent-muted)] text-rose-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Tabs + export */}
      <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 sm:px-6">
          <div className="flex">
            {([
              ["recipes", "Journal des ventes", BookOpen, filteredRecipes.length] as const,
              ["purchases", "Journal des achats", Receipt, filteredPurchases.length] as const,
            ]).map(([key, label, Icon, count]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-3 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
                  tab === key ? "border-rose-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Icon size={14} />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{key === "recipes" ? "Ventes" : "Achats"}</span>
                <span className="text-[11px] text-zinc-500">({count})</span>
              </button>
            ))}
          </div>
          <a
            href={`/api/accounting/excel?year=${year}&tab=${tab}`}
            className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-zinc-500 hover:text-zinc-200 hover:bg-[var(--color-bg-hover)] rounded-lg transition-colors"
            title="Export Excel/CSV"
          >
            <FileSpreadsheet size={14} />
            <span className="hidden sm:inline">Excel</span>
          </a>
        </div>

        {tab === "recipes" && (
          <div className="overflow-x-auto">
            {filteredRecipes.length === 0 ? (
              <div className="p-12 text-center">
                <BookOpen size={40} className="mx-auto text-zinc-700 mb-3" />
                <p className="text-zinc-500 text-sm">Aucune vente pour cette periode</p>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[var(--color-bg-hover)]/50 border-b border-[var(--color-border)]">
                    {["Date", "Facture", "Client", "Article", "Canal", "HT", "TVA", "TTC"].map((h, i) => (
                      <th key={h} className={`${i >= 5 ? "text-right" : "text-left"} px-4 py-2.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wider`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filteredRecipes.map((r, i) => (
                    <tr key={i} className="hover:bg-[var(--color-bg-hover)] transition-colors">
                      <td className="px-4 py-2.5 text-zinc-400 whitespace-nowrap">{formatDate(r.date)}</td>
                      <td className="px-4 py-2.5 text-zinc-500 font-mono text-[11px]">{r.invoiceNumber ?? "—"}</td>
                      <td className="px-4 py-2.5 text-zinc-300">{r.customerName ?? "—"}</td>
                      <td className="px-4 py-2.5 text-zinc-400 max-w-xs truncate">{r.productTitle ?? "—"}</td>
                      <td className="px-4 py-2.5 text-zinc-500">{r.channelLabel}</td>
                      <td className="px-4 py-2.5 text-zinc-300 text-right tabular-nums whitespace-nowrap">{formatCurrency(r.amountHT)}</td>
                      <td className="px-4 py-2.5 text-zinc-500 text-right tabular-nums whitespace-nowrap">{formatCurrency(r.vat)}</td>
                      <td className="px-4 py-2.5 text-white font-medium text-right tabular-nums whitespace-nowrap">{formatCurrency(r.amountTTC)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--color-bg-hover)] border-t-2 border-[var(--color-border)]">
                    <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-zinc-400 text-right">Totaux</td>
                    <td className="px-4 py-3 text-right text-[14px] font-semibold text-zinc-300 tabular-nums">{formatCurrency(totalRecipesHT)}</td>
                    <td className="px-4 py-3 text-right text-[14px] font-semibold text-zinc-400 tabular-nums">{formatCurrency(totalRecipesVAT)}</td>
                    <td className="px-4 py-3 text-right text-[15px] font-bold text-white tabular-nums">{formatCurrency(totalRecipesTTC)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}

        {tab === "purchases" && (
          <div className="overflow-x-auto">
            {filteredPurchases.length === 0 ? (
              <div className="p-12 text-center">
                <Receipt size={40} className="mx-auto text-zinc-700 mb-3" />
                <p className="text-zinc-500 text-sm">Aucun achat pour cette periode</p>
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[var(--color-bg-hover)]/50 border-b border-[var(--color-border)]">
                    {["Date", "SKU", "Description", "Fournisseur", "Cat.", "HT", "TVA ded.", "TTC"].map((h, i) => (
                      <th key={h} className={`${i >= 5 ? "text-right" : "text-left"} px-4 py-2.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wider`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border)]">
                  {filteredPurchases.map((p) => (
                    <tr key={p.id} className="hover:bg-[var(--color-bg-hover)] transition-colors">
                      <td className="px-4 py-2.5 text-zinc-400 whitespace-nowrap">{p.date ? formatDate(p.date) : "—"}</td>
                      <td className="px-4 py-2.5 text-zinc-500 font-mono text-[11px]">{p.productSku ?? "—"}</td>
                      <td className="px-4 py-2.5 text-zinc-300 max-w-xs truncate">{p.description}</td>
                      <td className="px-4 py-2.5 text-zinc-400">{p.supplier ?? "—"}</td>
                      <td className="px-4 py-2.5">
                        {p.category && (
                          <span className="inline-flex px-2 py-0.5 bg-[var(--color-bg-hover)] rounded text-[11px] text-zinc-400 capitalize">{p.category}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-300 text-right tabular-nums whitespace-nowrap">{formatCurrency(p.amountHT)}</td>
                      <td className={`px-4 py-2.5 text-right tabular-nums whitespace-nowrap ${p.vatDeductible ? "text-zinc-400" : "text-zinc-600 italic"}`}>
                        {p.vatDeductible ? formatCurrency(p.vat) : "non ded."}
                      </td>
                      <td className="px-4 py-2.5 text-white font-medium text-right tabular-nums whitespace-nowrap">{formatCurrency(p.amountTTC)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[var(--color-bg-hover)] border-t-2 border-[var(--color-border)]">
                    <td colSpan={5} className="px-4 py-3 text-sm font-semibold text-zinc-400 text-right">Totaux</td>
                    <td className="px-4 py-3 text-right text-[14px] font-semibold text-zinc-300 tabular-nums">{formatCurrency(totalPurchasesHT)}</td>
                    <td className="px-4 py-3 text-right text-[14px] font-semibold text-zinc-400 tabular-nums">{formatCurrency(totalPurchasesVAT)}</td>
                    <td className="px-4 py-3 text-right text-[15px] font-bold text-white tabular-nums">{formatCurrency(totalPurchasesTTC)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
