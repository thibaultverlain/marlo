"use client";

import { useState, useTransition, useMemo } from "react";
import Link from "next/link";
import { Save, AlertCircle, Star, X } from "lucide-react";
import { createCustomerAction } from "@/lib/actions/customers";
import { LUXURY_BRANDS } from "@/lib/data";

const inputClass = "w-full px-3 py-2.5 text-[13px] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-zinc-200 placeholder:text-zinc-600";
const labelClass = "block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5";

export default function NewCustomerForm() {
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", phone: "", instagram: "", address: "", city: "", preferredSizes: "", budgetRange: "", vip: false, notes: "" });
  const [preferredBrands, setPreferredBrands] = useState<string[]>([]);
  const [brandInput, setBrandInput] = useState("");
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filteredBrands = useMemo(() => {
    if (!brandInput) return [];
    return [...new Set(LUXURY_BRANDS)].filter((b) => b.toLowerCase().includes(brandInput.toLowerCase()) && !preferredBrands.includes(b)).slice(0, 6);
  }, [brandInput, preferredBrands]);

  function updateField(field: string, value: string | boolean) { setForm((prev) => ({ ...prev, [field]: value })); }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null);
    const formData = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (typeof v === "boolean") { if (v) formData.append(k, "on"); } else formData.append(k, v); });
    preferredBrands.forEach((b) => formData.append("preferredBrands", b));
    startTransition(async () => { const result = await createCustomerAction(formData); if (result?.error) setError(result.error); });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400"><AlertCircle size={16} className="flex-shrink-0 mt-0.5" /><span>{error}</span></div>}

      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelClass}>Prénom *</label><input type="text" required value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} className={inputClass} /></div>
          <div><label className={labelClass}>Nom *</label><input type="text" required value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} className={inputClass} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelClass}>Email</label><input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="client@email.com" className={inputClass} /></div>
          <div><label className={labelClass}>Téléphone</label><input type="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="06 12 34 56 78" className={inputClass} /></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelClass}>Instagram</label><input type="text" value={form.instagram} onChange={(e) => updateField("instagram", e.target.value)} placeholder="@username" className={inputClass} /></div>
          <div><label className={labelClass}>Ville</label><input type="text" value={form.city} onChange={(e) => updateField("city", e.target.value)} placeholder="Paris" className={inputClass} /></div>
        </div>
        <div><label className={labelClass}>Adresse</label><input type="text" value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder="Adresse complète" className={inputClass} /></div>

        <div className="border-t border-[var(--color-border)] pt-5">
          <h3 className="text-sm font-semibold text-zinc-300 mb-4">Préférences</h3>
          <div className="relative">
            <label className={labelClass}>Marques favorites</label>
            <div className="flex flex-wrap gap-1.5 mb-2">{preferredBrands.map((b) => <span key={b} className="inline-flex items-center gap-1 px-2 py-1 bg-zinc-800 rounded text-xs text-zinc-300">{b}<button type="button" onClick={() => setPreferredBrands(preferredBrands.filter((x) => x !== b))} className="hover:text-red-400"><X size={12} /></button></span>)}</div>
            <input type="text" value={brandInput} onChange={(e) => { setBrandInput(e.target.value); setShowBrandDropdown(true); }} onFocus={() => brandInput && setShowBrandDropdown(true)} onBlur={() => setTimeout(() => setShowBrandDropdown(false), 200)} placeholder="Ajouter..." className={inputClass} />
            {showBrandDropdown && filteredBrands.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg shadow-2xl max-h-40 overflow-y-auto">{filteredBrands.map((b) => <button key={b} type="button" onMouseDown={() => { setPreferredBrands([...preferredBrands, b]); setBrandInput(""); setShowBrandDropdown(false); }} className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-[var(--color-bg-hover)]">{b}</button>)}</div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div><label className={labelClass}>Tailles</label><input type="text" value={form.preferredSizes} onChange={(e) => updateField("preferredSizes", e.target.value)} placeholder="36/38, 42..." className={inputClass} /></div>
            <div><label className={labelClass}>Budget</label><input type="text" value={form.budgetRange} onChange={(e) => updateField("budgetRange", e.target.value)} placeholder="1000-3000€" className={inputClass} /></div>
          </div>
          <div className="mt-4"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.vip} onChange={(e) => updateField("vip", e.target.checked)} className="rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500" /><span className="text-sm text-zinc-300 flex items-center gap-1">Client VIP{form.vip && <Star size={12} className="text-amber-400 fill-amber-400" />}</span></label></div>
        </div>

        <div className="border-t border-[var(--color-border)] pt-5">
          <label className={labelClass}>Notes</label>
          <textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={4} placeholder="Préférences, habitudes..." className={`${inputClass} resize-none`} />
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pb-8">
        <Link href="/customers" className="px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors">Annuler</Link>
        <button type="submit" disabled={isPending} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"><Save size={16} />{isPending ? "Enregistrement..." : "Enregistrer"}</button>
      </div>
    </form>
  );
}
