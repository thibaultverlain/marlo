"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, X, Plus } from "lucide-react";
import { getMeasurementFields } from "@/lib/measurement-fields";

const inputClass = "w-full px-3 py-2.5 text-[13px] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 text-zinc-200 placeholder:text-zinc-500";
const labelClass = "block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5";

export type PremiumDetailsValue = {
  subcategory: string;
  material: string;
  countryOfOrigin: string;
  retailPrice: string;
  hasInvoice: boolean;
  measurements: Record<string, string>;
  signatureDetails: string[];
  keywords: string[];
};

export const EMPTY_PREMIUM_DETAILS: PremiumDetailsValue = {
  subcategory: "",
  material: "",
  countryOfOrigin: "",
  retailPrice: "",
  hasInvoice: false,
  measurements: {},
  signatureDetails: [],
  keywords: [],
};

/**
 * Section pliable avec les 8 champs additionnels utilises par le
 * generateur d'annonces IA. Tous optionnels mais plus tu remplis,
 * meilleure est l'annonce generee.
 */
export default function PremiumDetailsSection({
  category,
  value,
  onChange,
  defaultOpen = false,
}: {
  category: string;
  value: PremiumDetailsValue;
  onChange: (next: PremiumDetailsValue) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [signatureInput, setSignatureInput] = useState("");
  const [keywordInput, setKeywordInput] = useState("");

  const measurementFields = getMeasurementFields(category);

  function update<K extends keyof PremiumDetailsValue>(key: K, val: PremiumDetailsValue[K]) {
    onChange({ ...value, [key]: val });
  }

  function updateMeasurement(key: string, mval: string) {
    const next = { ...value.measurements };
    if (mval) next[key] = mval;
    else delete next[key];
    update("measurements", next);
  }

  function addSignature() {
    const v = signatureInput.trim();
    if (!v) return;
    if (value.signatureDetails.includes(v)) { setSignatureInput(""); return; }
    update("signatureDetails", [...value.signatureDetails, v]);
    setSignatureInput("");
  }

  function removeSignature(i: number) {
    update("signatureDetails", value.signatureDetails.filter((_, idx) => idx !== i));
  }

  function addKeyword() {
    const v = keywordInput.trim();
    if (!v) return;
    if (value.keywords.includes(v)) { setKeywordInput(""); return; }
    update("keywords", [...value.keywords, v]);
    setKeywordInput("");
  }

  function removeKeyword(i: number) {
    update("keywords", value.keywords.filter((_, idx) => idx !== i));
  }

  // Compte les champs remplis pour afficher dans le header
  const filledCount =
    (value.subcategory ? 1 : 0) +
    (value.material ? 1 : 0) +
    (value.countryOfOrigin ? 1 : 0) +
    (value.retailPrice ? 1 : 0) +
    (value.hasInvoice ? 1 : 0) +
    (Object.keys(value.measurements).length > 0 ? 1 : 0) +
    (value.signatureDetails.length > 0 ? 1 : 0) +
    (value.keywords.length > 0 ? 1 : 0);

  return (
    <div className="border-t border-[var(--color-border)] pt-5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between group"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center">
            <Sparkles size={14} className="text-rose-400" />
          </div>
          <div className="text-left">
            <p className="text-[14px] font-semibold text-white">Details premium</p>
            <p className="text-[11px] text-zinc-500 mt-0.5">
              Optionnel — plus tu remplis, meilleure est l'annonce IA generee
              {filledCount > 0 && <span className="text-rose-400 ml-2">{filledCount} rempli{filledCount > 1 ? "s" : ""}</span>}
            </p>
          </div>
        </div>
        {open ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
      </button>

      {open && (
        <div className="mt-5 space-y-5 animate-in fade-in">
          {/* Sous-categorie + Matiere */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Sous-categorie</label>
              <input
                type="text"
                value={value.subcategory}
                onChange={(e) => update("subcategory", e.target.value)}
                placeholder="Ex: vinyle, cuir graine, en toile..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Matiere / composition</label>
              <input
                type="text"
                value={value.material}
                onChange={(e) => update("material", e.target.value)}
                placeholder="88% coton, 10% PU, 2% elasthanne"
                className={inputClass}
              />
            </div>
          </div>

          {/* Pays + Prix boutique */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Pays de fabrication</label>
              <input
                type="text"
                value={value.countryOfOrigin}
                onChange={(e) => update("countryOfOrigin", e.target.value)}
                placeholder="Italie, France, Bulgarie..."
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Prix boutique d'origine</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={value.retailPrice}
                  onChange={(e) => update("retailPrice", e.target.value)}
                  placeholder="290.00"
                  className={`${inputClass} pr-8`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500">€</span>
              </div>
              <p className="text-[10px] text-zinc-500 mt-1">
                Servira d'ancre dans l'annonce ("Prix boutique : ~XXX €")
              </p>
            </div>
          </div>

          {/* Mesures dynamiques selon categorie */}
          <div>
            <label className={labelClass}>Mesures ({category})</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {measurementFields.map((f) => (
                <div key={f.key}>
                  <input
                    type="number"
                    step="0.1"
                    value={value.measurements[f.key] ?? ""}
                    onChange={(e) => updateMeasurement(f.key, e.target.value)}
                    placeholder={f.label}
                    className={inputClass}
                  />
                  {f.unit && (
                    <p className="text-[10px] text-zinc-600 mt-0.5 ml-1">{f.label} ({f.unit})</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Details signature */}
          <div>
            <label className={labelClass}>Details signature</label>
            <p className="text-[10px] text-zinc-500 -mt-1 mb-2">
              Elements distinctifs visibles sur la piece (logo brode, fermeture eclair, monogramme...)
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={signatureInput}
                onChange={(e) => setSignatureInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSignature(); } }}
                placeholder="Ex: logo brode, fermeture eclair dos, doublure soie..."
                className={inputClass}
              />
              <button
                type="button"
                onClick={addSignature}
                className="px-3 py-2.5 bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
              >
                <Plus size={14} className="text-zinc-400" />
              </button>
            </div>
            {value.signatureDetails.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {value.signatureDetails.map((d, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 text-rose-300 text-[11px] rounded-md"
                  >
                    {d}
                    <button
                      type="button"
                      onClick={() => removeSignature(i)}
                      className="hover:text-rose-100"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Mots-cles */}
          <div>
            <label className={labelClass}>Mots-cles SEO (Vinted)</label>
            <p className="text-[10px] text-zinc-500 -mt-1 mb-2">
              Pousses dans la description Vinted pour le SEO interne (ignore pour Vestiaire)
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addKeyword(); } }}
                placeholder="Ex: vintage, y2k, oversize..."
                className={inputClass}
              />
              <button
                type="button"
                onClick={addKeyword}
                className="px-3 py-2.5 bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
              >
                <Plus size={14} className="text-zinc-400" />
              </button>
            </div>
            {value.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {value.keywords.map((k, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--color-bg-hover)] text-zinc-300 text-[11px] rounded-md"
                  >
                    {k}
                    <button
                      type="button"
                      onClick={() => removeKeyword(i)}
                      className="hover:text-white"
                    >
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Facture disponible */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={value.hasInvoice}
              onChange={(e) => update("hasInvoice", e.target.checked)}
              className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg-raised)] text-rose-500"
            />
            <div>
              <p className="text-[13px] text-zinc-200 font-medium">Facture / preuve d'achat disponible</p>
              <p className="text-[11px] text-zinc-500">Mentionne dans l'annonce ("Facture disponible sur demande")</p>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
