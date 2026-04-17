"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Package, Trash2, ArrowRight, X, CheckCircle, FileText } from "lucide-react";
import { updateSourcingStatusAction, linkProductToSourcingAction, deleteSourcingAction } from "@/lib/actions/sourcing";
import { generateInvoiceFromSourcingAction } from "@/lib/actions/invoices";
import { formatCurrency } from "@/lib/utils";

type ProductOption = {
  id: string;
  title: string;
  sku: string;
  purchasePrice: number;
  targetPrice: number | null;
};

const NEXT_STATUS: Record<string, { next: string; label: string }[]> = {
  ouvert: [
    { next: "en_recherche", label: "Commencer la recherche" },
    { next: "annule", label: "Annuler" },
  ],
  en_recherche: [
    { next: "annule", label: "Annuler" },
  ],
  trouve: [
    { next: "achete", label: "Marquer comme acheté" },
    { next: "annule", label: "Annuler" },
  ],
  achete: [
    { next: "livre", label: "Marquer comme livré" },
  ],
  livre: [
    { next: "facture", label: "Générer la facture" },
  ],
  facture: [],
  annule: [],
};

export default function SourcingActions({
  sourcingId,
  status,
  hasFoundProduct,
  commissionRate,
  availableProducts,
}: {
  sourcingId: string;
  status: string;
  hasFoundProduct: boolean;
  commissionRate: number;
  availableProducts: ProductOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [salePrice, setSalePrice] = useState("");

  const selectedProduct = availableProducts.find((p) => p.id === selectedProductId);

  // Auto-fill prices when product is selected
  function handleProductSelect(id: string) {
    setSelectedProductId(id);
    const p = availableProducts.find((p) => p.id === id);
    if (p) {
      setPurchasePrice(String(p.purchasePrice));
      if (p.targetPrice) setSalePrice(String(p.targetPrice));
    }
  }

  const previewCommission = commissionRate > 0 && salePrice
    ? parseFloat(salePrice) * commissionRate
    : 0;

  function handleStatusChange(newStatus: string) {
    if (newStatus === "facture") {
      startTransition(async () => {
        const result = await generateInvoiceFromSourcingAction(sourcingId);
        if ("invoiceId" in result && result.invoiceId) {
          router.push(`/invoices/${result.invoiceId}`);
        }
      });
      return;
    }
    startTransition(async () => {
      await updateSourcingStatusAction(sourcingId, newStatus);
    });
  }

  function handleLinkProduct() {
    if (!selectedProductId || !purchasePrice || !salePrice) return;
    startTransition(async () => {
      const result = await linkProductToSourcingAction(
        sourcingId,
        selectedProductId,
        parseFloat(purchasePrice),
        parseFloat(salePrice)
      );
      if (!("error" in result) || !result.error) {
        setShowLinkDialog(false);
      }
    });
  }

  function handleDelete() {
    if (!confirm("Supprimer cette demande de sourcing ? Cette action est irréversible.")) return;
    startTransition(async () => {
      await deleteSourcingAction(sourcingId);
    });
  }

  const nextActions = NEXT_STATUS[status] || [];

  return (
    <>
      <div className="space-y-3">
        {/* Link product button for "en_recherche" or "ouvert" without a found product */}
        {!hasFoundProduct && ["ouvert", "en_recherche"].includes(status) && availableProducts.length > 0 && (
          <div className="bg-white rounded-xl border border-stone-200/60 p-5">
            <h3 className="text-sm font-semibold text-stone-700 mb-2">Pièce trouvée ?</h3>
            <p className="text-xs text-stone-500 mb-4">
              Lie un article de ton stock à cette demande pour calculer automatiquement la commission.
            </p>
            <button
              onClick={() => setShowLinkDialog(true)}
              disabled={isPending}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-700 rounded-lg hover:bg-green-800 transition-colors disabled:opacity-50"
            >
              <Package size={14} />
              Lier un article du stock
            </button>
          </div>
        )}

        {/* Status actions */}
        {nextActions.length > 0 && (
          <div className="bg-white rounded-xl border border-stone-200/60 p-5">
            <h3 className="text-sm font-semibold text-stone-700 mb-3">Actions</h3>
            <div className="flex flex-wrap gap-2">
              {nextActions.map((a) => (
                <button
                  key={a.next}
                  onClick={() => handleStatusChange(a.next)}
                  disabled={isPending}
                  className={`flex items-center gap-2 px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-50 ${
                    a.next === "annule"
                      ? "text-red-600 hover:bg-red-50"
                      : "text-stone-700 bg-white border border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  {a.next === "annule" ? <X size={14} /> : a.next === "livre" || a.next === "facture" ? <CheckCircle size={14} /> : <ArrowRight size={14} />}
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Delete */}
        <div className="flex items-center justify-between pt-4 border-t border-stone-100">
          <button
            onClick={handleDelete}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} />
            Supprimer la demande
          </button>
        </div>
      </div>

      {/* Link product dialog */}
      {showLinkDialog && (
        <div className="fixed inset-0 bg-stone-900/50 flex items-center justify-center z-50 p-4" onClick={() => setShowLinkDialog(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-stone-900">Lier un article</h3>
              <button onClick={() => setShowLinkDialog(false)} className="text-stone-400 hover:text-stone-700">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Article du stock</label>
              <select
                value={selectedProductId}
                onChange={(e) => handleProductSelect(e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="">Sélectionner...</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.sku} — {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Prix d'achat</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={purchasePrice}
                    onChange={(e) => setPurchasePrice(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">€</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Prix facturé au client</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={salePrice}
                    onChange={(e) => setSalePrice(e.target.value)}
                    className="w-full pl-3 pr-8 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">€</span>
                </div>
              </div>
            </div>

            {previewCommission > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                Commission : <span className="font-semibold">{formatCurrency(previewCommission)}</span>
                <span className="text-amber-600 text-xs ml-2">
                  ({(commissionRate * 100).toFixed(0)}% de {formatCurrency(parseFloat(salePrice) || 0)})
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowLinkDialog(false)}
                className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900"
              >
                Annuler
              </button>
              <button
                onClick={handleLinkProduct}
                disabled={!selectedProductId || !purchasePrice || !salePrice || isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
              >
                {isPending ? "Liaison..." : "Lier l'article"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
