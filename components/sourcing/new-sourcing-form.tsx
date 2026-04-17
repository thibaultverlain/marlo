"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { Save, AlertCircle, Star } from "lucide-react";
import { createSourcingAction } from "@/lib/actions/sourcing";
import { formatCurrency } from "@/lib/utils";
import { LUXURY_BRANDS } from "@/lib/data";

export default function NewSourcingForm({
  customers,
}: {
  customers: { id: string; name: string; vip: boolean }[];
}) {
  const [form, setForm] = useState({
    customerId: "",
    description: "",
    brand: "",
    model: "",
    targetBudget: "",
    commissionRate: "15", // %
    deadline: "",
    notes: "",
  });

  const [brandSearch, setBrandSearch] = useState("");
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredBrands = useMemo(() => {
    if (!brandSearch) return [];
    const q = brandSearch.toLowerCase();
    return [...new Set(LUXURY_BRANDS)].filter((b) => b.toLowerCase().includes(q)).slice(0, 6);
  }, [brandSearch]);

  const commissionPreview = useMemo(() => {
    const budget = parseFloat(form.targetBudget) || 0;
    const rate = parseFloat(form.commissionRate) || 0;
    if (budget <= 0 || rate <= 0) return null;
    return (budget * rate) / 100;
  }, [form.targetBudget, form.commissionRate]);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleBrandSelect(brand: string) {
    updateField("brand", brand);
    setBrandSearch(brand);
    setShowBrandDropdown(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));

    startTransition(async () => {
      const result = await createSourcingAction(fd);
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
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Client *</label>
          <select
            required
            value={form.customerId}
            onChange={(e) => updateField("customerId", e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          >
            <option value="">Pour qui recherche-t-on ?</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.vip ? "⭐ " : ""}{c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Description de la pièce *</label>
          <input
            type="text"
            required
            value={form.description}
            onChange={(e) => updateField("description", e.target.value)}
            placeholder="Ex: Birkin 25 Gold Togo avec PHW"
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Marque</label>
            <input
              type="text"
              value={brandSearch || form.brand}
              onChange={(e) => {
                setBrandSearch(e.target.value);
                updateField("brand", e.target.value);
                setShowBrandDropdown(true);
              }}
              onFocus={() => brandSearch && setShowBrandDropdown(true)}
              onBlur={() => setTimeout(() => setShowBrandDropdown(false), 200)}
              placeholder="Hermès, Chanel..."
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
            {showBrandDropdown && filteredBrands.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {filteredBrands.map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onMouseDown={() => handleBrandSelect(brand)}
                    className="w-full text-left px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                  >
                    {brand}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Modèle</label>
            <input
              type="text"
              value={form.model}
              onChange={(e) => updateField("model", e.target.value)}
              placeholder="Birkin 25, Classic Flap..."
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        <div className="border-t border-stone-100 pt-5">
          <h3 className="text-sm font-semibold text-stone-700 mb-4">Budget et commission</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Budget client max</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={form.targetBudget}
                  onChange={(e) => updateField("targetBudget", e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-3 pr-8 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">€</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Taux de commission</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.5"
                  value={form.commissionRate}
                  onChange={(e) => updateField("commissionRate", e.target.value)}
                  placeholder="15"
                  className="w-full pl-3 pr-8 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">%</span>
              </div>
            </div>
          </div>

          {commissionPreview !== null && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200/50 rounded-lg">
              <p className="text-sm text-amber-800">
                Commission estimée : <span className="font-semibold">{formatCurrency(commissionPreview)}</span>
                <span className="text-amber-600 text-xs ml-2">si pièce trouvée au budget max</span>
              </p>
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Deadline</label>
          <input
            type="date"
            value={form.deadline}
            onChange={(e) => updateField("deadline", e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
          <p className="text-[11px] text-stone-400 mt-1">
            Date limite indicative pour trouver la pièce (tu recevras une alerte 7 jours avant)
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            rows={3}
            placeholder="Précisions : état, couleur, taille, accessoires (boîte, dustbag, carte d'authenticité...)"
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pb-8">
        <Link href="/sourcing" className="px-4 py-2.5 text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors">
          Annuler
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {isPending ? "Création..." : "Créer la demande"}
        </button>
      </div>
    </form>
  );
}
