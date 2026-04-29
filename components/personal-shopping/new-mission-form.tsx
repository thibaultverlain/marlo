"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { Save, AlertCircle } from "lucide-react";
import { createMissionAction } from "@/lib/actions/personal-shopping";
const inputClass = "w-full px-3 py-2.5 text-[13px] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-zinc-200 placeholder:text-zinc-600";
const labelClass = "block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5";

export default function NewMissionForm() {
  const [form, setForm] = useState({ name: "", eventDate: new Date().toISOString().split("T")[0], location: "", notes: "" });
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  function updateField(f: string, v: string) { setForm((p)=>({...p,[f]:v})); }
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null); const fd = new FormData(); Object.entries(form).forEach(([k,v])=>fd.append(k,v));
    startTransition(async()=>{const r=await createMissionAction(fd);if(r?.error)setError(r.error);});
  }
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error&&<div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400"><AlertCircle size={16} className="flex-shrink-0 mt-0.5"/><span>{error}</span></div>}
      <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 space-y-5">
        <div><label className={labelClass}>Nom *</label><input type="text" required value={form.name} onChange={(e)=>updateField("name",e.target.value)} placeholder="Ex: Vente privée Dior avril" className={inputClass}/></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4"><div><label className={labelClass}>Date</label><input type="date" value={form.eventDate} onChange={(e)=>updateField("eventDate",e.target.value)} className={inputClass}/></div><div><label className={labelClass}>Lieu</label><input type="text" value={form.location} onChange={(e)=>updateField("location",e.target.value)} placeholder="Dior Avenue Montaigne" className={inputClass}/></div></div>
        <div><label className={labelClass}>Notes</label><textarea value={form.notes} onChange={(e)=>updateField("notes",e.target.value)} rows={3} placeholder="Précisions..." className={`${inputClass} resize-none`}/></div>
      </div>
      <div className="flex items-center justify-end gap-3 pb-8">
        <Link href="/personal-shopping" className="px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors">Annuler</Link>
        <button type="submit" disabled={isPending} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-cyan-500 rounded-lg hover:bg-cyan-400 transition-colors disabled:opacity-50"><Save size={16}/>{isPending?"...":"Créer"}</button>
      </div>
    </form>
  );
}
