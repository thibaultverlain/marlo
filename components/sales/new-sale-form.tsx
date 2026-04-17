"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { Save, AlertCircle } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { CHANNELS, calculatePlatformFees, calculateMargin, PLATFORM_FEES } from "@/lib/data";
import { createSaleAction } from "@/lib/actions/sales";

type ProductOption = {
  id: string;
  title: string;
  sku: string;
  purchasePrice: number;
  targetPrice: number | null;
};

type CustomerOption = {
  id: string;
  name: string;
};

export default function NewSaleForm({
  products,
  customers,
  preselectedProductId,
}: {
  products: ProductOption[];
  customers: CustomerOption[];
  preselectedProductId?: string;
}) {
  const [form, setForm] = useState({
    productId: preselectedProductId ?? "",
    channel: "vinted",
    customerId: "",
    salePrice: "",
    platformFees: "",
    platformFeesAuto: true,
    shippingCost: "",
    shippingPaidBy: "acheteur",
    paymentMethod: "plateforme",
    trackingNumber: "",
    notes: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedProduct = products.find((p) => p.id === form.productId);

  const autoFees = useMemo(() => {
    if (!form.platformFeesAuto || !form.salePrice) return 0;
    return calculatePlatformFees(form.channel, parseFloat(form.salePrice) || 0);
  }, [form.channel, form.salePrice, form.platformFeesAuto]);

  const currentFees = form.platformFeesAuto ? autoFees : parseFloat(form.platformFees) || 0;

  const marginCalc = useMemo(() => {
    if (!selectedProduct || !form.salePrice) return null;
    return calculateMargin(
      selectedProduct.purchasePrice,
      parseFloat(form.salePrice) || 0,
      currentFees,
      parseFloat(form.shippingCost) || 0,
      form.shippingPaidBy === "vendeur"
    );
  }, [selectedProduct, form.salePrice, currentFees, form.shippingCost, form.shippingPaidBy]);

  const channelInfo = PLATFORM_FEES[form.channel];

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Auto-set target price when product changes
  useMemo(() => {
    if (selectedProduct?.targetPrice && !form.salePrice) {
      setForm((prev) => ({ ...prev, salePrice: String(selectedProduct.targetPrice) }));
    }
  }, [selectedProduct]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("productId", form.productId);
    formData.append("customerId", form.customerId);
    formData.append("channel", form.channel);
    formData.append("salePrice", form.salePrice);
    formData.append("platformFees", form.platformFees);
    formData.append("platformFeesAuto", String(form.platformFeesAuto));
    formData.append("shippingCost", form.shippingCost || "0");
    formData.append("shippingPaidBy", form.shippingPaidBy);
    formData.append("paymentMethod", form.paymentMethod);
    formData.append("trackingNumber", form.trackingNumber);
    formData.append("notes", form.notes);

    startTransition(async () => {
      const result = await createSaleAction(formData);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200/60 p-6 space-y-5">
        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Article vendu *</label>
          <select
            required
            value={form.productId}
            onChange={(e) => updateField("productId", e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          >
            <option value="">Sélectionner un article...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.sku} — {p.title} (achat : {formatCurrency(p.purchasePrice)})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Canal de vente *</label>
            <select
              value={form.channel}
              onChange={(e) => updateField("channel", e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              {CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            {channelInfo && (
              <p className="text-[11px] text-stone-400 mt-1">{channelInfo.note}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Client (optionnel)</label>
            <select
              value={form.customerId}
              onChange={(e) => updateField("customerId", e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              <option value="">Aucun client</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>

        <div className="border-t border-stone-100 pt-5">
          <h3 className="text-sm font-semibold text-stone-700 mb-4">Montants</h3>

          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Prix de vente *</label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                required
                value={form.salePrice}
                onChange={(e) => updateField("salePrice", e.target.value)}
                placeholder="0.00"
                className="w-full pl-3 pr-8 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">€</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-stone-500 uppercase tracking-wider">Frais plateforme</label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.platformFeesAuto}
                    onChange={(e) => updateField("platformFeesAuto", e.target.checked)}
                    className="rounded border-stone-300 text-amber-600 focus:ring-amber-500"
                  />
                  <span className="text-[10px] text-stone-400">Auto</span>
                </label>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={form.platformFeesAuto ? autoFees.toFixed(2) : form.platformFees}
                  onChange={(e) => updateField("platformFees", e.target.value)}
                  disabled={form.platformFeesAuto}
                  className="w-full pl-3 pr-8 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 disabled:bg-stone-50 disabled:text-stone-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">€</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Frais de port</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={form.shippingCost}
                  onChange={(e) => updateField("shippingCost", e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-3 pr-8 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">€</span>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Frais de port payés par</label>
            <div className="flex gap-2">
              {[
                { value: "acheteur", label: "Acheteur" },
                { value: "vendeur", label: "Moi (vendeur)" },
                { value: "offert", label: "Offert" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateField("shippingPaidBy", opt.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                    form.shippingPaidBy === opt.value
                      ? "bg-stone-900 text-white border-stone-900"
                      : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {marginCalc && (
            <div className={`mt-4 p-4 rounded-lg border ${
              marginCalc.margin >= 0 ? "bg-green-50 border-green-200/50" : "bg-red-50 border-red-200/50"
            }`}>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-xs text-stone-500 mb-1">Revenu net</p>
                  <p className="text-lg font-semibold text-stone-900">{formatCurrency(marginCalc.netRevenue)}</p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 mb-1">Marge nette</p>
                  <p className={`text-lg font-semibold ${marginCalc.margin >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {formatCurrency(marginCalc.margin)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-500 mb-1">% Marge</p>
                  <p className={`text-lg font-semibold ${marginCalc.marginPct >= 0 ? "text-green-700" : "text-red-600"}`}>
                    {formatPercent(marginCalc.marginPct)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-stone-100 pt-5">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Mode de paiement</label>
              <select
                value={form.paymentMethod}
                onChange={(e) => updateField("paymentMethod", e.target.value)}
                className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              >
                <option value="plateforme">Via plateforme</option>
                <option value="virement">Virement</option>
                <option value="especes">Espèces</option>
                <option value="cb">Carte bancaire</option>
                <option value="paypal">PayPal</option>
                <option value="autre">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">N° de suivi</label>
              <input
                type="text"
                value={form.trackingNumber}
                onChange={(e) => updateField("trackingNumber", e.target.value)}
                placeholder="Numéro de tracking"
                className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            rows={2}
            placeholder="Notes sur la vente..."
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pb-8">
        <Link href="/sales" className="px-4 py-2.5 text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors">
          Annuler
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {isPending ? "Enregistrement..." : "Enregistrer la vente"}
        </button>
      </div>
    </form>
  );
}
