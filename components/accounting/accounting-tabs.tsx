"use client";
import { useState } from "react";
import { BookOpen, Receipt, Download } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type RecipeEntry = { date: string; invoiceNumber: string | null; customerName: string | null; productTitle: string | null; channel: string; channelLabel: string; amount: number; paymentMethod: string | null };
type PurchaseEntry = { id: string; date: string | null; description: string; supplier: string | null; amount: number; category: string | null; paymentMethod: string | null; productSku: string | null };

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows.map((row) => row.map((c) => { const s = String(c ?? ""); return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s.replace(/"/g, '""')}"` : s; }).join(",")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = filename; a.click();
}

export default function AccountingTabs({ year, activeTab, recipes, purchases }: { year: number; activeTab: string; recipes: RecipeEntry[]; purchases: PurchaseEntry[] }) {
  const [tab, setTab] = useState<"recipes" | "purchases">(activeTab === "purchases" ? "purchases" : "recipes");
  const totalRecipes = recipes.reduce((s, r) => s + r.amount, 0);
  const totalPurchases = purchases.reduce((s, p) => s + p.amount, 0);

  function exportRecipes() { downloadCSV(`livre-recettes-${year}.csv`, [["Date","N° Facture","Client","Article","Canal","Paiement","Montant (€)"], ...recipes.map((r) => [formatDate(r.date), r.invoiceNumber ?? "", r.customerName ?? "", r.productTitle ?? "", r.channelLabel, r.paymentMethod ?? "", r.amount.toFixed(2).replace(".",",")])]); }
  function exportPurchases() { downloadCSV(`registre-achats-${year}.csv`, [["Date","SKU","Description","Fournisseur","Catégorie","Paiement","Montant (€)"], ...purchases.map((p) => [p.date ? formatDate(p.date) : "", p.productSku ?? "", p.description, p.supplier ?? "", p.category ?? "", p.paymentMethod ?? "", p.amount.toFixed(2).replace(".",",")])]); }

  return (
    <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] overflow-hidden">
      <div className="flex items-center justify-between border-b border-[var(--color-border)] px-6">
        <div className="flex">
          {([["recipes", "Livre de recettes", BookOpen, recipes.length], ["purchases", "Registre des achats", Receipt, purchases.length]] as const).map(([key, label, Icon, count]) => (
            <button key={key} onClick={() => setTab(key)} className={`flex items-center gap-2 px-4 py-3 text-[13px] font-medium transition-colors border-b-2 -mb-px ${tab === key ? "border-indigo-500 text-white" : "border-transparent text-zinc-500 hover:text-zinc-300"}`}><Icon size={14} />{label}<span className="text-[11px] text-zinc-600">({count})</span></button>
          ))}
        </div>
        <button onClick={tab === "recipes" ? exportRecipes : exportPurchases} className="flex items-center gap-2 px-3 py-1.5 text-[13px] text-zinc-500 hover:text-zinc-200 hover:bg-[var(--color-bg-hover)] rounded-lg transition-colors"><Download size={14} />CSV</button>
      </div>

      {tab === "recipes" && (
        <div className="overflow-x-auto">
          {recipes.length === 0 ? <div className="p-12 text-center"><BookOpen size={40} className="mx-auto text-zinc-700 mb-3" /><p className="text-zinc-500 text-sm">Aucune recette pour {year}</p></div> : (
            <table className="w-full text-[13px]">
              <thead><tr className="bg-[var(--color-bg-hover)]/50 border-b border-[var(--color-border)]">{["Date","Facture","Client","Article","Canal","Paiement","Montant"].map((h,i) => <th key={h} className={`${i===6?"text-right":"text-left"} px-5 py-2.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wider`}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-[var(--color-border)]">{recipes.map((r, i) => (
                <tr key={i} className="hover:bg-[var(--color-bg-hover)] transition-colors">
                  <td className="px-5 py-2.5 text-zinc-400 whitespace-nowrap">{formatDate(r.date)}</td>
                  <td className="px-5 py-2.5 text-zinc-500 font-mono text-[11px]">{r.invoiceNumber ?? "—"}</td>
                  <td className="px-5 py-2.5 text-zinc-300">{r.customerName ?? "—"}</td>
                  <td className="px-5 py-2.5 text-zinc-400 max-w-xs truncate">{r.productTitle ?? "—"}</td>
                  <td className="px-5 py-2.5 text-zinc-500">{r.channelLabel}</td>
                  <td className="px-5 py-2.5 text-zinc-500">{r.paymentMethod ?? "—"}</td>
                  <td className="px-5 py-2.5 text-white font-medium text-right tabular-nums whitespace-nowrap">{formatCurrency(r.amount)}</td>
                </tr>))}</tbody>
              <tfoot><tr className="bg-[var(--color-bg-hover)] border-t-2 border-[var(--color-border)]"><td colSpan={6} className="px-5 py-3 text-sm font-semibold text-zinc-400 text-right">Total {year}</td><td className="px-5 py-3 text-right text-lg font-semibold text-white tabular-nums">{formatCurrency(totalRecipes)}</td></tr></tfoot>
            </table>
          )}
        </div>
      )}

      {tab === "purchases" && (
        <div className="overflow-x-auto">
          {purchases.length === 0 ? <div className="p-12 text-center"><Receipt size={40} className="mx-auto text-zinc-700 mb-3" /><p className="text-zinc-500 text-sm">Aucun achat pour {year}</p></div> : (
            <table className="w-full text-[13px]">
              <thead><tr className="bg-[var(--color-bg-hover)]/50 border-b border-[var(--color-border)]">{["Date","SKU","Description","Fournisseur","Catégorie","Montant"].map((h,i) => <th key={h} className={`${i===5?"text-right":"text-left"} px-5 py-2.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wider`}>{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-[var(--color-border)]">{purchases.map((p) => (
                <tr key={p.id} className="hover:bg-[var(--color-bg-hover)] transition-colors">
                  <td className="px-5 py-2.5 text-zinc-400 whitespace-nowrap">{p.date ? formatDate(p.date) : "—"}</td>
                  <td className="px-5 py-2.5 text-zinc-500 font-mono text-[11px]">{p.productSku ?? "—"}</td>
                  <td className="px-5 py-2.5 text-zinc-300 max-w-xs truncate">{p.description}</td>
                  <td className="px-5 py-2.5 text-zinc-400">{p.supplier ?? "—"}</td>
                  <td className="px-5 py-2.5">{p.category && <span className="inline-flex px-2 py-0.5 bg-[var(--color-bg-hover)] rounded text-[11px] text-zinc-400 capitalize">{p.category}</span>}</td>
                  <td className="px-5 py-2.5 text-white font-medium text-right tabular-nums whitespace-nowrap">{formatCurrency(p.amount)}</td>
                </tr>))}</tbody>
              <tfoot><tr className="bg-[var(--color-bg-hover)] border-t-2 border-[var(--color-border)]"><td colSpan={5} className="px-5 py-3 text-sm font-semibold text-zinc-400 text-right">Total {year}</td><td className="px-5 py-3 text-right text-lg font-semibold text-white tabular-nums">{formatCurrency(totalPurchases)}</td></tr></tfoot>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
