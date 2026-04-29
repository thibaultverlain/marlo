"use client";
import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { Save, AlertCircle } from "lucide-react";
import { createSourcingAction } from "@/lib/actions/sourcing";
import { formatCurrency } from "@/lib/utils";
import { LUXURY_BRANDS } from "@/lib/data";

const inputClass = "w-full px-3 py-2.5 text-[13px] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-zinc-200 placeholder:text-zinc-600";
const labelClass = "block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5";

export default function NewSourcingForm({ customers }: { customers: { id: string; name: string; vip: boolean }[] }) {
  const [form, setForm] = useState({ customerId: "", description: "", brand: "", model: "", targetBudget: "", commissionRate: "15", deadline: "", notes: "" });
  const [brandSearch, setBrandSearch] = useState("");
  const [showDD, setShowDD] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const filteredBrands = useMemo(() => !brandSearch ? [] : [...new Set(LUXURY_BRANDS)].filter((b) => b.toLowerCase().includes(brandSearch.toLowerCase())).slice(0, 6), [brandSearch]);
  const commPreview = useMemo(() => { const b = parseFloat(form.targetBudget)||0, r = parseFloat(form.commissionRate)||0; return b>0&&r>0 ? (b*r)/100 : null; }, [form.targetBudget, form.commissionRate]);
  function updateField(f: string, v: string) { setForm((p) => ({ ...p, [f]: v })); }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null);
    const fd = new FormData(); Object.entries(form).forEach(([k,v]) => fd.append(k,v));
    startTransition(async () => { const r = await createSourcingAction(fd); if (r?.error) setError(r.error); });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400"><AlertCircle size={16} className="flex-shrink-0 mt-0.5" /><span>{error}</span></div>}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 space-y-5">
        <div><label className={labelClass}>Client *</label><select required value={form.customerId} onChange={(e) => updateField("customerId", e.target.value)} className={inputClass}><option value="">Pour qui ?</option>{customers.map((c) => <option key={c.id} value={c.id}>{c.vip?"* ":""}{c.name}</option>)}</select></div>
        <div><label className={labelClass}>Description *</label><input type="text" required value={form.description} onChange={(e) => updateField("description", e.target.value)} placeholder="Ex: Birkin 25 Gold Togo" className={inputClass} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative"><label className={labelClass}>Marque</label><input type="text" value={brandSearch||form.brand} onChange={(e)=>{setBrandSearch(e.target.value);updateField("brand",e.target.value);setShowDD(true);}} onFocus={()=>brandSearch&&setShowDD(true)} onBlur={()=>setTimeout(()=>setShowDD(false),200)} placeholder="Hermès..." className={inputClass} />{showDD&&filteredBrands.length>0&&<div className="absolute z-10 w-full mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg shadow-2xl max-h-48 overflow-y-auto">{filteredBrands.map((b)=><button key={b} type="button" onMouseDown={()=>{updateField("brand",b);setBrandSearch(b);setShowDD(false);}} className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-[var(--color-bg-hover)]">{b}</button>)}</div>}</div>
          <div><label className={labelClass}>Modèle</label><input type="text" value={form.model} onChange={(e) => updateField("model", e.target.value)} placeholder="Birkin 25..." className={inputClass} /></div>
        </div>
        <div className="border-t border-[var(--color-border)] pt-5"><h3 className="text-sm font-semibold text-zinc-300 mb-4">Budget et commission</h3><div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className={labelClass}>Budget max</label><div className="relative"><input type="number" step="0.01" value={form.targetBudget} onChange={(e) => updateField("targetBudget", e.target.value)} placeholder="0" className={`${inputClass} pr-8`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-600">€</span></div></div>
          <div><label className={labelClass}>Commission</label><div className="relative"><input type="number" step="0.5" value={form.commissionRate} onChange={(e) => updateField("commissionRate", e.target.value)} className={`${inputClass} pr-8`} /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-600">%</span></div></div>
        </div>{commPreview!==null&&<div className="mt-3 p-3 bg-cyan-500/[0.08] border border-indigo-500/20 rounded-lg text-sm text-cyan-300">Commission estimée : <span className="font-semibold">{formatCurrency(commPreview)}</span></div>}</div>
        <div><label className={labelClass}>Deadline</label><input type="date" value={form.deadline} onChange={(e) => updateField("deadline", e.target.value)} className={inputClass} /></div>
        <div><label className={labelClass}>Notes</label><textarea value={form.notes} onChange={(e) => updateField("notes", e.target.value)} rows={3} placeholder="Précisions..." className={`${inputClass} resize-none`} /></div>
      </div>
      <div className="flex items-center justify-end gap-3 pb-8">
        <Link href="/sourcing" className="px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors">Annuler</Link>
        <button type="submit" disabled={isPending} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-cyan-500 rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50"><Save size={16} />{isPending ? "..." : "Créer"}</button>
      </div>
    </form>
  );
}
