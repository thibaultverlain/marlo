"use client";

import { useState } from "react";
import { BookOpen, Receipt, Download } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type RecipeEntry = {
  date: string;
  invoiceNumber: string | null;
  customerName: string | null;
  productTitle: string | null;
  channel: string;
  channelLabel: string;
  amount: number;
  paymentMethod: string | null;
};

type PurchaseEntry = {
  id: string;
  date: string | null;
  description: string;
  supplier: string | null;
  amount: number;
  category: string | null;
  paymentMethod: string | null;
  productSku: string | null;
};

function downloadCSV(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          // Escape if contains comma, quote, or newline
          if (s.includes(",") || s.includes('"') || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
          }
          return s;
        })
        .join(",")
    )
    .join("\n");

  const bom = "\uFEFF"; // BOM for Excel UTF-8
  const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
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
  const [tab, setTab] = useState<"recipes" | "purchases">(
    activeTab === "purchases" ? "purchases" : "recipes"
  );

  function exportRecipes() {
    const rows: string[][] = [
      ["Date", "N° Facture", "Client", "Article", "Canal", "Mode de paiement", "Montant (€)"],
      ...recipes.map((r) => [
        formatDate(r.date),
        r.invoiceNumber ?? "",
        r.customerName ?? "",
        r.productTitle ?? "",
        r.channelLabel,
        r.paymentMethod ?? "",
        r.amount.toFixed(2).replace(".", ","),
      ]),
    ];
    downloadCSV(`livre-recettes-${year}.csv`, rows);
  }

  function exportPurchases() {
    const rows: string[][] = [
      ["Date", "SKU", "Description", "Fournisseur", "Catégorie", "Mode de paiement", "Montant (€)"],
      ...purchases.map((p) => [
        p.date ? formatDate(p.date) : "",
        p.productSku ?? "",
        p.description,
        p.supplier ?? "",
        p.category ?? "",
        p.paymentMethod ?? "",
        p.amount.toFixed(2).replace(".", ","),
      ]),
    ];
    downloadCSV(`registre-achats-${year}.csv`, rows);
  }

  const totalRecipes = recipes.reduce((s, r) => s + r.amount, 0);
  const totalPurchases = purchases.reduce((s, p) => s + p.amount, 0);

  return (
    <div className="bg-white rounded-xl border border-stone-200/60 overflow-hidden">
      {/* Tabs header */}
      <div className="flex items-center justify-between border-b border-stone-100 px-6">
        <div className="flex">
          <button
            onClick={() => setTab("recipes")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === "recipes"
                ? "border-stone-900 text-stone-900"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            <BookOpen size={14} />
            Livre de recettes
            <span className="text-xs text-stone-400">({recipes.length})</span>
          </button>
          <button
            onClick={() => setTab("purchases")}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === "purchases"
                ? "border-stone-900 text-stone-900"
                : "border-transparent text-stone-500 hover:text-stone-700"
            }`}
          >
            <Receipt size={14} />
            Registre des achats
            <span className="text-xs text-stone-400">({purchases.length})</span>
          </button>
        </div>

        <button
          onClick={tab === "recipes" ? exportRecipes : exportPurchases}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-stone-600 hover:text-stone-900 hover:bg-stone-50 rounded-lg transition-colors"
        >
          <Download size={14} />
          Export CSV
        </button>
      </div>

      {/* Recipes table */}
      {tab === "recipes" && (
        <div className="overflow-x-auto">
          {recipes.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen size={40} className="mx-auto text-stone-300 mb-3" />
              <p className="text-stone-500">Aucune recette pour l'année {year}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50/50 border-b border-stone-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider">Facture</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider">Client</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider">Article</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider">Canal</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider">Paiement</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {recipes.map((r, i) => (
                  <tr key={i} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-3 text-stone-600 whitespace-nowrap">{formatDate(r.date)}</td>
                    <td className="px-4 py-3 text-stone-600 font-mono text-xs">{r.invoiceNumber ?? "—"}</td>
                    <td className="px-4 py-3 text-stone-800">{r.customerName ?? "—"}</td>
                    <td className="px-4 py-3 text-stone-600 max-w-xs truncate">{r.productTitle ?? "—"}</td>
                    <td className="px-4 py-3 text-stone-500">{r.channelLabel}</td>
                    <td className="px-4 py-3 text-stone-500 text-xs">{r.paymentMethod ?? "—"}</td>
                    <td className="px-6 py-3 text-stone-900 font-semibold text-right whitespace-nowrap">
                      {formatCurrency(r.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-stone-50 border-t-2 border-stone-200">
                  <td colSpan={6} className="px-6 py-3 text-sm font-semibold text-stone-700 text-right">
                    Total des recettes {year}
                  </td>
                  <td className="px-6 py-3 text-right text-lg font-semibold text-stone-900">
                    {formatCurrency(totalRecipes)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}

      {/* Purchases table */}
      {tab === "purchases" && (
        <div className="overflow-x-auto">
          {purchases.length === 0 ? (
            <div className="p-12 text-center">
              <Receipt size={40} className="mx-auto text-stone-300 mb-3" />
              <p className="text-stone-500">Aucun achat enregistré pour l'année {year}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-stone-50/50 border-b border-stone-100">
                  <th className="text-left px-6 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider">SKU</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider">Fournisseur</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider">Catégorie</th>
                  <th className="text-right px-6 py-3 text-xs font-medium text-stone-400 uppercase tracking-wider">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-3 text-stone-600 whitespace-nowrap">
                      {p.date ? formatDate(p.date) : "—"}
                    </td>
                    <td className="px-4 py-3 text-stone-500 font-mono text-xs">{p.productSku ?? "—"}</td>
                    <td className="px-4 py-3 text-stone-800 max-w-xs truncate">{p.description}</td>
                    <td className="px-4 py-3 text-stone-600">{p.supplier ?? "—"}</td>
                    <td className="px-4 py-3">
                      {p.category && (
                        <span className="inline-flex px-2 py-0.5 bg-stone-100 rounded text-[11px] text-stone-600 capitalize">
                          {p.category}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-stone-900 font-semibold text-right whitespace-nowrap">
                      {formatCurrency(p.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-stone-50 border-t-2 border-stone-200">
                  <td colSpan={5} className="px-6 py-3 text-sm font-semibold text-stone-700 text-right">
                    Total des achats {year}
                  </td>
                  <td className="px-6 py-3 text-right text-lg font-semibold text-stone-900">
                    {formatCurrency(totalPurchases)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
