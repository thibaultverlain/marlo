"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Save, AlertCircle, CheckCircle2, Info, Building2,
  MapPin, Phone, Wallet, Receipt, ChevronDown,
} from "lucide-react";
import { saveShopSettingsAction } from "@/lib/actions/settings";
import type { ShopSettings } from "@/lib/db/schema";

const inputClass = "w-full px-3 py-2.5 text-[13px] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 text-zinc-200 placeholder:text-zinc-500";
const labelClass = "block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5";

function FieldHelp({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] text-zinc-500 mt-1">{children}</p>;
}

// Validation
function isValidSiret(s: string): boolean {
  if (!s || s.length !== 14 || !/^\d+$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let d = parseInt(s[i], 10);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

function isValidIban(s: string): boolean {
  if (!s) return true; // Optional
  const cleaned = s.replace(/\s/g, "");
  return /^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(cleaned);
}

export default function SettingsForm({ initialData }: { initialData: ShopSettings | undefined }) {
  const [form, setForm] = useState({
    legalName: initialData?.legalName ?? "",
    commercialName: initialData?.commercialName ?? "",
    legalStatus: initialData?.legalStatus ?? "Micro-entrepreneur (EI)",
    siret: initialData?.siret ?? "",
    rcs: initialData?.rcs ?? "",
    apeCode: initialData?.apeCode ?? "",
    address: initialData?.address ?? "",
    postalCode: initialData?.postalCode ?? "",
    city: initialData?.city ?? "",
    country: initialData?.country ?? "France",
    email: initialData?.email ?? "",
    phone: initialData?.phone ?? "",
    website: initialData?.website ?? "",
    iban: initialData?.iban ?? "",
    bic: initialData?.bic ?? "",
    bankName: initialData?.bankName ?? "",
    vatSubject: initialData?.vatSubject ?? false,
    vatNumber: initialData?.vatNumber ?? "",
    vatRate: initialData?.vatRate ? String(Number(initialData.vatRate)) : "0.20",
    invoicePrefix: initialData?.invoicePrefix ?? "F",
    paymentTerms: initialData?.paymentTerms ?? "Paiement comptant",
    legalMention: initialData?.legalMention ?? "",
  });

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Validation
  const siretValid = !form.siret || isValidSiret(form.siret);
  const ibanValid = isValidIban(form.iban);

  // Completion KPI
  const completion = useMemo(() => {
    const required = ["legalName", "address", "postalCode", "city", "siret"];
    const optional = ["commercialName", "rcs", "apeCode", "email", "phone", "iban", "bic", "bankName"];
    const allFields = [...required, ...optional];
    const filled = allFields.filter((f) => {
      const v = (form as any)[f];
      return v && String(v).trim().length > 0;
    }).length;
    const pct = Math.round((filled / allFields.length) * 100);
    const requiredFilled = required.filter((f) => (form as any)[f] && String((form as any)[f]).trim().length > 0).length;
    return { pct, filled, total: allFields.length, requiredFilled, requiredTotal: required.length, allRequired: requiredFilled === required.length };
  }, [form]);

  function updateField(field: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
    setDirty(true);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (form.siret && !siretValid) {
      setError("Le SIRET est invalide (14 chiffres requis et somme de Luhn correcte)");
      return;
    }
    if (!ibanValid) {
      setError("L'IBAN est mal formate");
      return;
    }

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (typeof v === "boolean") { if (v) fd.append(k, "on"); }
      else fd.append(k, v);
    });
    startTransition(async () => {
      const r = await saveShopSettingsAction(fd);
      if (r?.error) setError(r.error);
      else {
        setSaved(true);
        setDirty(false);
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-24">
      {/* Completion KPI */}
      <div className="card-static p-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Configuration</p>
            <p className="text-[20px] font-bold text-white tabular-nums mt-1">{completion.pct}%</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              {completion.filled} / {completion.total} champs renseignes
              {!completion.allRequired && (
                <span className="text-amber-400 ml-2">
                  · {completion.requiredFilled} / {completion.requiredTotal} obligatoires
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="mt-3 h-1.5 bg-[var(--color-bg-hover)] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${completion.pct >= 80 ? "bg-emerald-500" : completion.pct >= 50 ? "bg-amber-500" : "bg-rose-500"}`}
            style={{ width: `${completion.pct}%` }}
          />
        </div>
      </div>

      {/* Banners */}
      {!initialData && (
        <div className="flex items-start gap-2 p-4 bg-amber-500/[0.08] border border-amber-500/20 rounded-lg text-sm text-amber-400">
          <Info size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1 text-amber-300">Configuration initiale</p>
            <p className="text-[12px] text-amber-400/80">Remplis au moins : raison sociale, adresse, SIRET et regime TVA.</p>
          </div>
        </div>
      )}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
      {saved && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400">
          <CheckCircle2 size={16} />
          <span>Enregistre.</span>
        </div>
      )}

      {/* Identite legale */}
      <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 space-y-5">
        <h2 className="text-[15px] font-semibold text-white flex items-center gap-2">
          <Building2 size={15} className="text-rose-400" />
          Identite legale
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Raison sociale *</label>
            <input type="text" required value={form.legalName} onChange={(e) => updateField("legalName", e.target.value)} placeholder="Dupont Thibault" className={inputClass} />
            <FieldHelp>Nom legal de l'entreprise ou prenom + nom pour un EI</FieldHelp>
          </div>
          <div>
            <label className={labelClass}>Nom commercial</label>
            <input type="text" value={form.commercialName} onChange={(e) => updateField("commercialName", e.target.value)} placeholder="Marlo Luxury" className={inputClass} />
            <FieldHelp>Affiche au public, peut differer du nom legal</FieldHelp>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Statut</label>
            <select value={form.legalStatus} onChange={(e) => updateField("legalStatus", e.target.value)} className={inputClass}>
              {["Micro-entrepreneur (EI)","Entrepreneur individuel (EI)","EURL","SASU","SAS","SARL","Autre"].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>SIRET *</label>
            <input
              type="text"
              value={form.siret}
              onChange={(e) => updateField("siret", e.target.value.replace(/\D/g, "").slice(0, 14))}
              placeholder="14 chiffres"
              className={`${inputClass} font-mono ${form.siret && !siretValid ? "border-red-500/50 focus:ring-red-500/50" : ""}`}
            />
            <FieldHelp>
              {form.siret && !siretValid
                ? <span className="text-red-400">SIRET invalide (somme de Luhn incorrecte)</span>
                : "14 chiffres, sans espaces. Indique sur ton avis Insee"}
            </FieldHelp>
          </div>
          <div>
            <label className={labelClass}>Code APE</label>
            <input type="text" value={form.apeCode} onChange={(e) => updateField("apeCode", e.target.value)} placeholder="4771Z" className={inputClass} />
            <FieldHelp>Code d'activite (Insee)</FieldHelp>
          </div>
        </div>
        <div>
          <label className={labelClass}>RCS</label>
          <input type="text" value={form.rcs} onChange={(e) => updateField("rcs", e.target.value)} placeholder="RCS Paris 123456789" className={inputClass} />
          <FieldHelp>Mention du Registre du Commerce et des Societes (obligatoire pour societes, optionnel pour micro)</FieldHelp>
        </div>
      </div>

      {/* Adresse */}
      <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 space-y-5">
        <h2 className="text-[15px] font-semibold text-white flex items-center gap-2">
          <MapPin size={15} className="text-emerald-400" />
          Adresse
        </h2>
        <div>
          <label className={labelClass}>Adresse *</label>
          <input type="text" required value={form.address} onChange={(e) => updateField("address", e.target.value)} placeholder="12 rue de Rivoli" className={inputClass} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Code postal *</label>
            <input type="text" required value={form.postalCode} onChange={(e) => updateField("postalCode", e.target.value)} placeholder="75001" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Ville *</label>
            <input type="text" required value={form.city} onChange={(e) => updateField("city", e.target.value)} placeholder="Paris" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Pays</label>
            <input type="text" value={form.country} onChange={(e) => updateField("country", e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      {/* Contact public */}
      <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 space-y-5">
        <h2 className="text-[15px] font-semibold text-white flex items-center gap-2">
          <Phone size={15} className="text-rose-400" />
          Contact public
        </h2>
        <p className="text-[11px] text-zinc-500 -mt-2">Information visible sur tes factures</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Email</label>
            <input type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} placeholder="contact@maboutique.fr" className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>Telephone</label>
            <input type="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} placeholder="06 12 34 56 78" className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Site web</label>
          <input type="url" value={form.website} onChange={(e) => updateField("website", e.target.value)} placeholder="https://maboutique.fr" className={inputClass} />
        </div>
      </div>

      {/* TVA */}
      <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 space-y-5">
        <h2 className="text-[15px] font-semibold text-white flex items-center gap-2">
          <Receipt size={15} className="text-amber-400" />
          Regime TVA
        </h2>
        <label className="flex items-start gap-3 cursor-pointer">
          <input type="checkbox" checked={form.vatSubject} onChange={(e) => updateField("vatSubject", e.target.checked)}
            className="mt-1 rounded border-[var(--color-border)] bg-[var(--color-bg)] text-rose-500 focus:ring-rose-500" />
          <div>
            <p className="text-sm text-zinc-200">Je suis assujetti a la TVA</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">Si decoche : mention "TVA non applicable, art. 293 B du CGI" automatique sur les factures.</p>
          </div>
        </label>
        {form.vatSubject && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[var(--color-border)]">
            <div>
              <label className={labelClass}>N° TVA</label>
              <input type="text" value={form.vatNumber} onChange={(e) => updateField("vatNumber", e.target.value)} placeholder="FR12345678901" className={`${inputClass} font-mono`} />
              <FieldHelp>Numero intracommunautaire (FR + 11 chiffres)</FieldHelp>
            </div>
            <div>
              <label className={labelClass}>Taux TVA</label>
              <select value={form.vatRate} onChange={(e) => updateField("vatRate", e.target.value)} className={inputClass}>
                <option value="0.20">20% (taux normal)</option>
                <option value="0.10">10% (taux reduit)</option>
                <option value="0.055">5,5% (taux super reduit)</option>
                <option value="0">0%</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Banque */}
      <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 space-y-5">
        <h2 className="text-[15px] font-semibold text-white flex items-center gap-2">
          <Wallet size={15} className="text-emerald-400" />
          Banque
        </h2>
        <div>
          <label className={labelClass}>IBAN</label>
          <input
            type="text"
            value={form.iban}
            onChange={(e) => updateField("iban", e.target.value.toUpperCase())}
            placeholder="FR76 3000 4000 5000 6000 7000 12"
            className={`${inputClass} font-mono ${form.iban && !ibanValid ? "border-red-500/50 focus:ring-red-500/50" : ""}`}
          />
          <FieldHelp>
            {form.iban && !ibanValid ? <span className="text-red-400">Format IBAN invalide</span> : "Affiche sur les factures pour faciliter le paiement"}
          </FieldHelp>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>BIC</label>
            <input type="text" value={form.bic} onChange={(e) => updateField("bic", e.target.value.toUpperCase())} placeholder="BDFEFRPP" className={`${inputClass} font-mono`} />
            <FieldHelp>Code SWIFT/BIC de ta banque (8 ou 11 caracteres)</FieldHelp>
          </div>
          <div>
            <label className={labelClass}>Banque</label>
            <input type="text" value={form.bankName} onChange={(e) => updateField("bankName", e.target.value)} placeholder="Credit Agricole" className={inputClass} />
          </div>
        </div>
      </div>

      {/* Facturation */}
      <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6 space-y-5">
        <h2 className="text-[15px] font-semibold text-white flex items-center gap-2">
          <Receipt size={15} className="text-emerald-400" />
          Facturation
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Prefixe facture</label>
            <input type="text" value={form.invoicePrefix} onChange={(e) => updateField("invoicePrefix", e.target.value.toUpperCase().slice(0, 5))} className={inputClass} />
            <FieldHelp>Format : {form.invoicePrefix || "F"}-2026-0001</FieldHelp>
          </div>
          <div>
            <label className={labelClass}>Conditions paiement</label>
            <input type="text" value={form.paymentTerms} onChange={(e) => updateField("paymentTerms", e.target.value)} className={inputClass} />
          </div>
        </div>
        <div>
          <label className={labelClass}>Mention legale</label>
          <textarea value={form.legalMention} onChange={(e) => updateField("legalMention", e.target.value)} rows={2}
            placeholder="Ex: Dispense d'immatriculation au RCS, ou conditions particulieres" className={`${inputClass} resize-none`} />
        </div>
      </div>

      {/* Sticky save bar */}
      {dirty && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-[var(--color-bg-card)] border-t border-[var(--color-border)] backdrop-blur-md shadow-2xl">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <p className="text-[12px] text-zinc-400">Modifications non enregistrees</p>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors disabled:opacity-50"
            >
              <Save size={14} />
              {isPending ? "..." : "Enregistrer"}
            </button>
          </div>
        </div>
      )}

      {!dirty && (
        <div className="flex items-center justify-end gap-3">
          <button type="submit" disabled={isPending}
            className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors disabled:opacity-50">
            <Save size={16} />
            {isPending ? "..." : "Enregistrer"}
          </button>
        </div>
      )}
    </form>
  );
}
