"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { Camera, Save, AlertCircle } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { LUXURY_BRANDS, CATEGORIES, CONDITIONS, CHANNELS } from "@/lib/data";
import { createProductAction } from "@/lib/actions/products";

export default function NewProductForm() {
  const [form, setForm] = useState({
    title: "",
    brand: "",
    model: "",
    category: "sacs",
    size: "",
    color: "",
    condition: "tres_bon",
    purchasePrice: "",
    targetPrice: "",
    purchaseSource: "",
    purchaseDate: new Date().toISOString().split("T")[0],
    listedOn: [] as string[],
    serialNumber: "",
    notes: "",
  });

  const [brandSearch, setBrandSearch] = useState("");
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredBrands = useMemo(() => {
    if (!brandSearch) return [];
    const q = brandSearch.toLowerCase();
    return [...new Set(LUXURY_BRANDS)].filter((b) => b.toLowerCase().includes(q)).slice(0, 8);
  }, [brandSearch]);

  const marginPreview = useMemo(() => {
    const purchase = parseFloat(form.purchasePrice) || 0;
    const target = parseFloat(form.targetPrice) || 0;
    if (purchase <= 0 || target <= 0) return null;
    const margin = target - purchase;
    const pct = (margin / purchase) * 100;
    return { margin, pct };
  }, [form.purchasePrice, form.targetPrice]);

  function updateField(field: string, value: string | string[]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleListedOn(channel: string) {
    setForm((prev) => ({
      ...prev,
      listedOn: prev.listedOn.includes(channel)
        ? prev.listedOn.filter((c) => c !== channel)
        : [...prev.listedOn, channel],
    }));
  }

  function handleBrandSelect(brand: string) {
    updateField("brand", brand);
    setBrandSearch(brand);
    setShowBrandDropdown(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.append("title", form.title || `${form.brand} ${form.model || form.category}`.trim());
    formData.append("brand", form.brand);
    formData.append("model", form.model);
    formData.append("category", form.category);
    formData.append("size", form.size);
    formData.append("color", form.color);
    formData.append("condition", form.condition);
    formData.append("purchasePrice", form.purchasePrice);
    formData.append("targetPrice", form.targetPrice);
    formData.append("purchaseSource", form.purchaseSource);
    formData.append("purchaseDate", form.purchaseDate);
    form.listedOn.forEach((ch) => formData.append("listedOn", ch));
    formData.append("serialNumber", form.serialNumber);
    formData.append("notes", form.notes);

    startTransition(async () => {
      const result = await createProductAction(formData);
      if (result?.error) {
        setError(result.error);
      }
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

      <div className="bg-white rounded-xl border border-stone-200/60 border-dashed p-8 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-all group">
        <Camera size={32} className="mx-auto text-stone-300 group-hover:text-amber-500 transition-colors" />
        <p className="text-sm text-stone-500 mt-2">Ajouter des photos</p>
        <p className="text-xs text-stone-400 mt-1">À connecter avec Supabase Storage</p>
      </div>

      <div className="bg-white rounded-xl border border-stone-200/60 p-6 space-y-5">
        <div className="relative">
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Marque *</label>
          <input
            type="text"
            required
            value={brandSearch || form.brand}
            onChange={(e) => {
              setBrandSearch(e.target.value);
              updateField("brand", e.target.value);
              setShowBrandDropdown(true);
            }}
            onFocus={() => brandSearch && setShowBrandDropdown(true)}
            onBlur={() => setTimeout(() => setShowBrandDropdown(false), 200)}
            placeholder="Ex: Chanel, Hermès, Jordan..."
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

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Modèle</label>
            <input
              type="text"
              value={form.model}
              onChange={(e) => updateField("model", e.target.value)}
              placeholder="Ex: Classic Flap, Birkin 25..."
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Titre (optionnel)</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              placeholder="Auto-généré si vide"
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Catégorie</label>
            <select
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            >
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Taille</label>
            <input
              type="text"
              value={form.size}
              onChange={(e) => updateField("size", e.target.value)}
              placeholder="Ex: M, 42..."
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Couleur</label>
            <input
              type="text"
              value={form.color}
              onChange={(e) => updateField("color", e.target.value)}
              placeholder="Ex: Noir, Gold..."
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">État</label>
          <select
            value={form.condition}
            onChange={(e) => updateField("condition", e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          >
            {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div className="border-t border-stone-100 pt-5">
          <h3 className="text-sm font-semibold text-stone-700 mb-4">Prix</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Prix d'achat *</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.purchasePrice}
                  onChange={(e) => updateField("purchasePrice", e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-3 pr-8 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">€</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Prix de vente visé</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={form.targetPrice}
                  onChange={(e) => updateField("targetPrice", e.target.value)}
                  placeholder="0.00"
                  className="w-full pl-3 pr-8 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">€</span>
              </div>
            </div>
          </div>

          {marginPreview && (
            <div className="mt-3 flex items-center gap-4 p-3 bg-green-50 border border-green-200/50 rounded-lg">
              <div className="text-sm text-green-700">
                Marge prévue : <span className="font-semibold">{formatCurrency(marginPreview.margin)}</span>
              </div>
              <div className="text-sm text-green-600 font-semibold">{formatPercent(marginPreview.pct)}</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Source d'achat</label>
            <input
              type="text"
              value={form.purchaseSource}
              onChange={(e) => updateField("purchaseSource", e.target.value)}
              placeholder="Ex: Friperie..."
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Date d'achat</label>
            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => updateField("purchaseDate", e.target.value)}
              className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">En vente sur</label>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.filter(c => c.value !== "autre").map((ch) => (
              <button
                key={ch.value}
                type="button"
                onClick={() => toggleListedOn(ch.value)}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  form.listedOn.includes(ch.value)
                    ? "bg-stone-900 text-white border-stone-900"
                    : "bg-white text-stone-500 border-stone-200 hover:border-stone-300"
                }`}
              >
                {ch.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Numéro de série (optionnel)</label>
          <input
            type="text"
            value={form.serialNumber}
            onChange={(e) => updateField("serialNumber", e.target.value)}
            placeholder="Pour traçabilité et authenticité"
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-stone-500 uppercase tracking-wider mb-1.5">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => updateField("notes", e.target.value)}
            rows={3}
            placeholder="Notes libres sur l'article..."
            className="w-full px-3 py-2.5 text-sm border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pb-8">
        <Link href="/products" className="px-4 py-2.5 text-sm font-medium text-stone-500 hover:text-stone-700 transition-colors">
          Annuler
        </Link>
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
        >
          <Save size={16} />
          {isPending ? "Enregistrement..." : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
