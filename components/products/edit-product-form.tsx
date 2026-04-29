"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { Save, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { LUXURY_BRANDS, CATEGORIES, CONDITIONS, CHANNELS, PRODUCT_STATUSES } from "@/lib/data";
import { updateProductAction } from "@/lib/actions/products";

const inputClass = "w-full px-3 py-2.5 text-[13px] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-zinc-200 placeholder:text-zinc-600";
const labelClass = "block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5";

type ProductData = {
  id: string; title: string; brand: string; model: string; category: string;
  size: string; color: string; condition: string; purchasePrice: string;
  targetPrice: string; purchaseSource: string; purchaseDate: string;
  listedOn: string[]; serialNumber: string; notes: string; status: string;
};

export default function EditProductForm({ product }: { product: ProductData }) {
  const [form, setForm] = useState({ ...product });
  const [brandSearch, setBrandSearch] = useState(product.brand);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  const filteredBrands = useMemo(() => {
    if (!brandSearch) return [];
    return [...new Set(LUXURY_BRANDS)].filter((b) => b.toLowerCase().includes(brandSearch.toLowerCase())).slice(0, 8);
  }, [brandSearch]);

  const marginPreview = useMemo(() => {
    const purchase = parseFloat(form.purchasePrice) || 0;
    const target = parseFloat(form.targetPrice) || 0;
    if (purchase <= 0 || target <= 0) return null;
    return { margin: target - purchase, pct: ((target - purchase) / purchase) * 100 };
  }, [form.purchasePrice, form.targetPrice]);

  function updateField(field: string, value: string | string[]) { setForm((prev) => ({ ...prev, [field]: value })); setSaved(false); }
  function toggleListedOn(channel: string) {
    setForm((prev) => ({ ...prev, listedOn: prev.listedOn.includes(channel) ? prev.listedOn.filter((c) => c !== channel) : [...prev.listedOn, channel] }));
    setSaved(false);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null); setSaved(false);
    const formData = new FormData();
    formData.append("title", form.title); formData.append("brand", form.brand);
    formData.append("model", form.model); formData.append("category", form.category);
    formData.append("size", form.size); formData.append("color", form.color);
    formData.append("condition", form.condition); formData.append("purchasePrice", form.purchasePrice);
    formData.append("targetPrice", form.targetPrice); formData.append("purchaseSource", form.purchaseSource);
    formData.append("purchaseDate", form.purchaseDate); formData.append("status", form.status);
    form.listedOn.forEach((ch) => formData.append("listedOn", ch));
    formData.append("serialNumber", form.serialNumber); formData.append("notes", form.notes);

    startTransition(async () => {
      const result = await updateProductAction(product.id, formData);
      if (result?.error) setError(result.error);
      else { setSaved(true); setTimeout(() => setSaved(false), 3000); }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400"><AlertCircle size={16} className="flex-shrink-0 mt-0.5" /><span>{error}</span></div>}
      {saved && <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400"><CheckCircle2 size={16} /><span>Modifications enregistrées.</span></div>}

      <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 space-y-5">
        {/* Status */}
        <div>
          <label className={labelClass}>Statut</label>
          <select value={form.status} onChange={(e) => updateField("status", e.target.value)} className={inputClass}>
            {PRODUCT_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Brand */}
        <div className="relative">
          <label className={labelClass}>Marque *</label>
          <input type="text" required value={brandSearch}
            onChange={(e) => { setBrandSearch(e.target.value); updateField("brand", e.target.value); setShowBrandDropdown(true); }}
            onFocus={() => brandSearch && setShowBrandDropdown(true)}
            onBlur={() => setTimeout(() => setShowBrandDropdown(false), 200)}
            className={inputClass} />
          {showBrandDropdown && filteredBrands.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg shadow-2xl max-h-48 overflow-y-auto">
              {filteredBrands.map((b) => <button key={b} type="button" onMouseDown={() => { updateField("brand", b); setBrandSearch(b); setShowBrandDropdown(false); }} className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-[var(--color-bg-hover)]">{b}</button>)}
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelClass}>Modèle</label><input type="text" value={form.model} onChange={(e) => updateField("model", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Titre</label><input type="text" value={form.title} onChange={(e) => updateField("title", e.target.value)} className={inputClass} /></div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div><label className={labelClass}>Catégorie</label><select value={form.category} onChange={(e) => updateField("category", e.target.value)} className={inputClass}>{CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
          <div><label className={labelClass}>Taille</label><input type="text" value={form.size} onChange={(e) => updateField("size", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Couleur</label><input type="text" value={form.color} onChange={(e) => updateField("color", e.target.value)} className={inputClass} /></div>
        </div>

        <div><label className={labelClass}>État</label><select value={form.condition} onChange={(e) => updateField("condition", e.target.value)} className={inputClass}>{CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>

        <div className="border-t border-[var(--color-border)] pt-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Prix</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div><label className={labelClass}>Prix d'achat</label><div className="relative"><input type="number" step="0.01" value={form.purchasePrice} onChange={(e) => updateField("purchasePrice", e.target.value)} className={`${inputClass} pr-8`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-600">€</span></div></div>
            <div><label className={labelClass}>Prix de vente visé</label><div className="relative"><input type="number" step="0.01" value={form.targetPrice} onChange={(e) => updateField("targetPrice", e.target.value)} className={`${inputClass} pr-8`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-600">€</span></div></div>
          </div>
          {marginPreview && (
            <div className="mt-3 flex items-center gap-4 p-3 bg-emerald-500/[0.08] border border-emerald-500/20 rounded-lg">
              <span className="text-sm text-emerald-400">Marge prévue : <span className="font-semibold">{formatCurrency(marginPreview.margin)}</span></span>
              <span className="text-sm text-emerald-300 font-semibold">{formatPercent(marginPreview.pct)}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelClass}>Source d'achat</label><input type="text" value={form.purchaseSource} onChange={(e) => updateField("purchaseSource", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Date d'achat</label><input type="date" value={form.purchaseDate} onChange={(e) => updateField("purchaseDate", e.target.value)} className={inputClass} /></div>
        </div>

        <div>
          <label className={`${labelClass} mb-2`}>En vente sur</label>
          <div className="flex flex-wrap gap-2">
            {CHANNELS.filter(c => c.value !== "autre").map((ch) => (
              <button key={ch.value} type="button" onClick={() => toggleListedOn(ch.value)}
                className={`px-3 py-1.5 text-[13px] rounded-lg border transition-colors ${form.listedOn.includes(ch.value) ? "bg-cyan-500 text-white border-indigo-600" : "bg-transparent text-zinc-400 border-[var(--color-border)] hover:border-zinc-600"}`}>{ch.label}</button>
            ))}
          </div>
        </div>

        <div><label className={labelClass}>Numéro de série</label><input type="text" value={form.serialNumber} onChange={(e) => updateField("serialNumber", e.target.value)} className={inputClass} /></div>
        <div><label className={labelClass}>Notes</label><textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={3} className={`${inputClass} resize-none`} /></div>
      </div>

      <div className="flex items-center justify-end gap-3 pb-8">
        <Link href={`/products/${product.id}`} className="px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors">Annuler</Link>
        <button type="submit" disabled={isPending} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-cyan-500 rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50">
          <Save size={16} />{isPending ? "..." : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}
