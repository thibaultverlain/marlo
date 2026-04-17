"use client";
import { useState, useTransition } from "react";
import { Save, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { saveShopSettingsAction } from "@/lib/actions/settings";
import type { ShopSettings } from "@/lib/db/schema";

const inputClass = "w-full px-3 py-2.5 text-[13px] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 text-zinc-200 placeholder:text-zinc-600";
const labelClass = "block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5";

export default function SettingsForm({ initialData }: { initialData: ShopSettings | undefined }) {
  const [form, setForm] = useState({
    legalName: initialData?.legalName ?? "", commercialName: initialData?.commercialName ?? "",
    legalStatus: initialData?.legalStatus ?? "Micro-entrepreneur (EI)", siret: initialData?.siret ?? "",
    rcs: initialData?.rcs ?? "", apeCode: initialData?.apeCode ?? "",
    address: initialData?.address ?? "", postalCode: initialData?.postalCode ?? "",
    city: initialData?.city ?? "", country: initialData?.country ?? "France",
    email: initialData?.email ?? "", phone: initialData?.phone ?? "", website: initialData?.website ?? "",
    iban: initialData?.iban ?? "", bic: initialData?.bic ?? "", bankName: initialData?.bankName ?? "",
    vatSubject: initialData?.vatSubject ?? false, vatNumber: initialData?.vatNumber ?? "",
    vatRate: initialData?.vatRate ? String(Number(initialData.vatRate)) : "0.20",
    invoicePrefix: initialData?.invoicePrefix ?? "F",
    paymentTerms: initialData?.paymentTerms ?? "Paiement comptant", legalMention: initialData?.legalMention ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function updateField(field: string, value: string | boolean) { setForm((prev) => ({ ...prev, [field]: value })); setSaved(false); }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null);
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => { if (typeof v === "boolean") { if (v) fd.append(k, "on"); } else fd.append(k, v); });
    startTransition(async () => { const r = await saveShopSettingsAction(fd); if (r?.error) setError(r.error); else { setSaved(true); setTimeout(() => setSaved(false), 3000); } });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {!initialData && <div className="flex items-start gap-2 p-4 bg-amber-500/[0.08] border border-amber-500/20 rounded-lg text-sm text-amber-400"><Info size={16} className="flex-shrink-0 mt-0.5" /><div><p className="font-semibold mb-1 text-amber-300">Configuration initiale</p><p className="text-[12px] text-amber-400/80">Remplis au moins : raison sociale, adresse, SIRET et régime TVA.</p></div></div>}
      {error && <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400"><AlertCircle size={16} className="flex-shrink-0 mt-0.5" /><span>{error}</span></div>}
      {saved && <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400"><CheckCircle2 size={16} /><span>Enregistré.</span></div>}

      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 space-y-5">
        <h2 className="text-[15px] font-semibold text-white">Identité légale</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Raison sociale *</label><input type="text" required value={form.legalName} onChange={(e) => updateField("legalName", e.target.value)} placeholder="Dupont Thibault" className={inputClass} /></div>
          <div><label className={labelClass}>Nom commercial</label><input type="text" value={form.commercialName} onChange={(e) => updateField("commercialName", e.target.value)} placeholder="Marlo Luxury" className={inputClass} /></div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className={labelClass}>Statut</label><select value={form.legalStatus} onChange={(e) => updateField("legalStatus", e.target.value)} className={inputClass}>{["Micro-entrepreneur (EI)","Entrepreneur individuel (EI)","EURL","SASU","SAS","SARL","Autre"].map((s)=><option key={s} value={s}>{s}</option>)}</select></div>
          <div><label className={labelClass}>SIRET</label><input type="text" value={form.siret} onChange={(e) => updateField("siret", e.target.value.replace(/\D/g,"").slice(0,14))} placeholder="14 chiffres" className={`${inputClass} font-mono`} /></div>
          <div><label className={labelClass}>Code APE</label><input type="text" value={form.apeCode} onChange={(e) => updateField("apeCode", e.target.value)} placeholder="4771Z" className={inputClass} /></div>
        </div>
      </div>

      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 space-y-5">
        <h2 className="text-[15px] font-semibold text-white">Adresse</h2>
        <div><label className={labelClass}>Adresse *</label><input type="text" required value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder="12 rue de Rivoli" className={inputClass} /></div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className={labelClass}>Code postal *</label><input type="text" required value={form.postalCode} onChange={(e) => updateField("postalCode", e.target.value)} placeholder="75001" className={inputClass} /></div>
          <div><label className={labelClass}>Ville *</label><input type="text" required value={form.city} onChange={(e) => updateField("city", e.target.value)} placeholder="Paris" className={inputClass} /></div>
          <div><label className={labelClass}>Pays</label><input type="text" value={form.country} onChange={(e) => updateField("country", e.target.value)} className={inputClass} /></div>
        </div>
      </div>

      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 space-y-5">
        <h2 className="text-[15px] font-semibold text-white">Régime TVA</h2>
        <label className="flex items-start gap-3 cursor-pointer"><input type="checkbox" checked={form.vatSubject} onChange={(e) => updateField("vatSubject", e.target.checked)} className="mt-1 rounded border-zinc-600 bg-zinc-800 text-indigo-500 focus:ring-indigo-500" /><div><p className="text-sm text-zinc-200">Je suis assujetti à la TVA</p><p className="text-[11px] text-zinc-500 mt-0.5">Si décoché : mention "TVA non applicable, art. 293 B du CGI" automatique sur les factures.</p></div></label>
        {form.vatSubject && <div className="grid grid-cols-2 gap-4 pt-2">
          <div><label className={labelClass}>N° TVA</label><input type="text" value={form.vatNumber} onChange={(e) => updateField("vatNumber", e.target.value)} placeholder="FR12345678901" className={`${inputClass} font-mono`} /></div>
          <div><label className={labelClass}>Taux TVA</label><select value={form.vatRate} onChange={(e) => updateField("vatRate", e.target.value)} className={inputClass}><option value="0.20">20%</option><option value="0.10">10%</option><option value="0.055">5,5%</option><option value="0">0%</option></select></div>
        </div>}
      </div>

      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 space-y-5">
        <h2 className="text-[15px] font-semibold text-white">Banque</h2>
        <div><label className={labelClass}>IBAN</label><input type="text" value={form.iban} onChange={(e) => updateField("iban", e.target.value.toUpperCase())} placeholder="FR76 3000..." className={`${inputClass} font-mono`} /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>BIC</label><input type="text" value={form.bic} onChange={(e) => updateField("bic", e.target.value.toUpperCase())} placeholder="BDFEFRPP" className={`${inputClass} font-mono`} /></div>
          <div><label className={labelClass}>Banque</label><input type="text" value={form.bankName} onChange={(e) => updateField("bankName", e.target.value)} placeholder="Crédit Agricole" className={inputClass} /></div>
        </div>
      </div>

      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 space-y-5">
        <h2 className="text-[15px] font-semibold text-white">Facturation</h2>
        <div className="grid grid-cols-2 gap-4">
          <div><label className={labelClass}>Préfixe facture</label><input type="text" value={form.invoicePrefix} onChange={(e) => updateField("invoicePrefix", e.target.value.toUpperCase().slice(0,5))} className={inputClass} /><p className="text-[10px] text-zinc-600 mt-1">Format : {form.invoicePrefix||"F"}-2026-0001</p></div>
          <div><label className={labelClass}>Conditions paiement</label><input type="text" value={form.paymentTerms} onChange={(e) => updateField("paymentTerms", e.target.value)} className={inputClass} /></div>
        </div>
        <div><label className={labelClass}>Mention légale</label><textarea value={form.legalMention} onChange={(e) => updateField("legalMention", e.target.value)} rows={2} placeholder="Ex: Dispensé d'immatriculation au RCS" className={`${inputClass} resize-none`} /></div>
      </div>

      <div className="flex items-center justify-end gap-3 pb-8">
        <button type="submit" disabled={isPending} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"><Save size={16} />{isPending ? "..." : "Enregistrer"}</button>
      </div>
    </form>
  );
}
