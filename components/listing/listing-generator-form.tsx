"use client";

import { useMemo, useState, useTransition } from "react";
import { Copy, Check, AlertTriangle, Sparkles, Loader2, ChevronDown } from "lucide-react";
import { generateListing } from "@/lib/actions/listing";
import { getMeasurementFields } from "@/lib/listing/measurement-fields";
import type { ListingInput } from "@/lib/listing/build-prompt";

const CATEGORIES = [
  { value: "sacs",        label: "Sacs" },
  { value: "chaussures",  label: "Chaussures" },
  { value: "vetements",   label: "Vetements" },
  { value: "accessoires", label: "Accessoires" },
  { value: "montres",     label: "Montres" },
  { value: "bijoux",      label: "Bijoux" },
  { value: "autre",       label: "Autre" },
];

const CONDITIONS = [
  { value: "neuf avec etiquettes",  label: "Neuf avec etiquettes" },
  { value: "neuf sans etiquettes",  label: "Neuf sans etiquettes" },
  { value: "comme neuf",            label: "Comme neuf" },
  { value: "tres bon etat",         label: "Tres bon etat" },
  { value: "bon etat",              label: "Bon etat" },
  { value: "etat correct",          label: "Etat correct" },
];

const SOURCES = ["Veepee", "Brands4Friends", "The Bradery", "Outlet", "Vinted", "Cliente privee", "Revendeur reseau", "Autre"];

type FormState = {
  marque: string;
  modele: string;
  categorie: string;
  sous_categorie: string;
  taille: string;
  couleur: string;
  etat: string;
  source_achat: string;
  date_achat: string;
  facture_disponible: boolean;
  matiere_composition: string;
  pays_fabrication: string;
  mesures: Record<string, string>;
  numero_serie: string;
  prix_boutique: string;
  prix_vente: string;
  details_signature: string; // separe par virgules
  mots_cles: string;         // separe par virgules
  plateforme: "vinted" | "vestiaire";
};

const INITIAL_STATE: FormState = {
  marque: "", modele: "", categorie: "sacs", sous_categorie: "",
  taille: "", couleur: "", etat: "neuf sans etiquettes",
  source_achat: "Veepee", date_achat: new Date().toISOString().split("T")[0],
  facture_disponible: false,
  matiere_composition: "", pays_fabrication: "",
  mesures: {}, numero_serie: "",
  prix_boutique: "", prix_vente: "",
  details_signature: "", mots_cles: "",
  plateforme: "vinted",
};

export default function ListingGeneratorForm() {
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [result, setResult] = useState<{ titre: string; description: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [copiedField, setCopiedField] = useState<"titre" | "description" | null>(null);

  const measurementFields = useMemo(() => getMeasurementFields(form.categorie), [form.categorie]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateMesure(key: string, value: string) {
    setForm((prev) => ({ ...prev, mesures: { ...prev.mesures, [key]: value } }));
  }

  function buildInput(): ListingInput {
    const mesuresCleaned: Record<string, number | string> = {};
    for (const [k, v] of Object.entries(form.mesures)) {
      if (v?.trim() !== "" && v !== undefined) {
        const n = Number(v);
        mesuresCleaned[k] = !isNaN(n) ? n : v;
      }
    }
    const details = form.details_signature.split(",").map((s) => s.trim()).filter(Boolean);
    const mots = form.mots_cles.split(",").map((s) => s.trim()).filter(Boolean);

    return {
      marque: form.marque.trim(),
      modele: form.modele.trim(),
      categorie: form.categorie,
      sous_categorie: form.sous_categorie.trim() || undefined,
      taille: form.taille.trim(),
      couleur: form.couleur.trim(),
      etat: form.etat,
      source_achat: form.source_achat,
      date_achat: form.date_achat,
      facture_disponible: form.facture_disponible,
      matiere_composition: form.matiere_composition.trim() || undefined,
      pays_fabrication: form.pays_fabrication.trim() || undefined,
      mesures: Object.keys(mesuresCleaned).length > 0 ? mesuresCleaned : undefined,
      numero_serie: form.numero_serie.trim() || undefined,
      prix_boutique: form.prix_boutique ? Number(form.prix_boutique) : undefined,
      prix_vente: Number(form.prix_vente),
      details_signature: details.length > 0 ? details : undefined,
      mots_cles: mots.length > 0 ? mots : undefined,
      plateforme: form.plateforme,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    const input = buildInput();
    startTransition(async () => {
      const res = await generateListing(input);
      if ("error" in res) setError(res.error);
      else setResult(res);
    });
  }

  function handleCopy(field: "titre" | "description", text: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Formulaire */}
      <form onSubmit={handleSubmit} className="card-static p-5 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={16} className="text-rose-400" />
          <h2 className="text-[14px] font-semibold text-white">Details de la piece</h2>
        </div>

        {/* Plateforme */}
        <div>
          <Label>Plateforme cible</Label>
          <div className="flex gap-2">
            {(["vinted", "vestiaire"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => update("plateforme", p)}
                className={`flex-1 px-3 py-2 rounded-lg text-[13px] font-medium border transition-colors ${
                  form.plateforme === p
                    ? "bg-rose-500/15 border-rose-500/40 text-rose-300"
                    : "bg-transparent border-[var(--color-border)] text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Marque + modele */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Marque *">
            <Input value={form.marque} onChange={(v) => update("marque", v)} placeholder="Courreges" />
          </Field>
          <Field label="Modele *">
            <Input value={form.modele} onChange={(v) => update("modele", v)} placeholder="Bucket Hat vinyle" />
          </Field>
        </div>

        {/* Categorie + sous-cat */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Categorie *">
            <Select value={form.categorie} onChange={(v) => update("categorie", v)}>
              {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </Select>
          </Field>
          <Field label="Sous-categorie">
            <Input value={form.sous_categorie} onChange={(v) => update("sous_categorie", v)} placeholder="Bob / bucket hat" />
          </Field>
        </div>

        {/* Couleur + taille */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Couleur *">
            <Input value={form.couleur} onChange={(v) => update("couleur", v)} placeholder="Noir" />
          </Field>
          <Field label="Taille *">
            <Input value={form.taille} onChange={(v) => update("taille", v)} placeholder="S" />
          </Field>
        </div>

        {/* Etat */}
        <Field label="Etat *">
          <Select value={form.etat} onChange={(v) => update("etat", v)}>
            {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </Select>
        </Field>

        {/* Matiere + pays */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Matiere / composition">
            <Input value={form.matiere_composition} onChange={(v) => update("matiere_composition", v)} placeholder="Vinyle enduit" />
          </Field>
          <Field label="Pays fabrication">
            <Input value={form.pays_fabrication} onChange={(v) => update("pays_fabrication", v)} placeholder="Italie" />
          </Field>
        </div>

        {/* Mesures dynamiques */}
        {measurementFields.length > 0 && (
          <div>
            <Label>Mesures ({form.categorie})</Label>
            <div className="grid grid-cols-2 gap-2">
              {measurementFields.map((f) => (
                <div key={f.key} className="relative">
                  <Input
                    value={form.mesures[f.key] ?? ""}
                    onChange={(v) => updateMesure(f.key, v)}
                    placeholder={`${f.label}${f.unit ? ` (${f.unit})` : ""}`}
                    type="number"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prix */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prix boutique EUR">
            <Input value={form.prix_boutique} onChange={(v) => update("prix_boutique", v)} placeholder="290" type="number" />
          </Field>
          <Field label="Prix de vente EUR *">
            <Input value={form.prix_vente} onChange={(v) => update("prix_vente", v)} placeholder="149" type="number" />
          </Field>
        </div>

        {/* Reference */}
        <Field label="Reference / numero de serie">
          <Input value={form.numero_serie} onChange={(v) => update("numero_serie", v)} placeholder="624ACP014VY0003" />
        </Field>

        {/* Details signature + mots-cles */}
        <Field label="Details signature (separes par virgule)">
          <Input value={form.details_signature} onChange={(v) => update("details_signature", v)} placeholder="Boucle metal AA, tampon interieur, ..." />
        </Field>
        <Field label="Mots-cles strategiques (separes par virgule)">
          <Input value={form.mots_cles} onChange={(v) => update("mots_cles", v)} placeholder="bob, bucket hat, casquette, ..." />
        </Field>

        {/* Source + date + facture */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Source d'achat *">
            <Select value={form.source_achat} onChange={(v) => update("source_achat", v)}>
              {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </Field>
          <Field label="Date d'achat *">
            <Input value={form.date_achat} onChange={(v) => update("date_achat", v)} type="date" />
          </Field>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.facture_disponible}
            onChange={(e) => update("facture_disponible", e.target.checked)}
            className="w-4 h-4 rounded border-[var(--color-border)] bg-[var(--color-bg)] text-rose-500 focus:ring-rose-500 focus:ring-1"
          />
          <span className="text-[13px] text-zinc-300">Facture d'achat disponible</span>
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-500 hover:bg-rose-400 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-semibold text-[14px]"
        >
          {isPending ? (
            <><Loader2 size={16} className="animate-spin" /> Generation en cours...</>
          ) : (
            <><Sparkles size={16} /> Generer l'annonce</>
          )}
        </button>
      </form>

      {/* Resultat */}
      <div className="space-y-4">
        {error && (
          <div className="card-static p-4 flex items-start gap-3 border-red-500/30 bg-red-500/[0.04]">
            <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-[13px] font-semibold text-red-300">Erreur</p>
              <p className="text-[12px] text-red-200 mt-1 whitespace-pre-wrap">{error}</p>
            </div>
          </div>
        )}

        {result ? (
          <>
            <div className="card-static p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Titre</h3>
                <button
                  onClick={() => handleCopy("titre", result.titre)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                >
                  {copiedField === "titre" ? <Check size={11} /> : <Copy size={11} />}
                  {copiedField === "titre" ? "Copie" : "Copier"}
                </button>
              </div>
              <p className="text-[15px] font-medium text-white">{result.titre}</p>
              <p className="text-[10px] text-zinc-500 mt-2 tabular-nums">{result.titre.length} caracteres</p>
            </div>

            <div className="card-static p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[12px] font-semibold text-zinc-400 uppercase tracking-wider">Description</h3>
                <button
                  onClick={() => handleCopy("description", result.description)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded text-[11px] text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                >
                  {copiedField === "description" ? <Check size={11} /> : <Copy size={11} />}
                  {copiedField === "description" ? "Copie" : "Copier"}
                </button>
              </div>
              <p className="text-[13px] text-zinc-200 whitespace-pre-wrap leading-relaxed">{result.description}</p>
            </div>
          </>
        ) : !error && !isPending ? (
          <div className="card-static p-8 text-center border-dashed">
            <Sparkles size={28} className="mx-auto text-zinc-700 mb-3" />
            <p className="text-[13px] text-zinc-500">Remplis le formulaire puis clique sur "Generer l'annonce".</p>
            <p className="text-[11px] text-zinc-600 mt-2">Sortie sobre, factuelle, sans invention. Aucune ligne pour un champ vide.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">{children}</p>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Input({
  value, onChange, placeholder, type = "text",
}: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-3 py-2 text-[13px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 text-zinc-200 placeholder:text-zinc-500"
    />
  );
}

function Select({
  value, onChange, children,
}: { value: string; onChange: (v: string) => void; children: React.ReactNode }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full pl-3 pr-8 py-2 text-[13px] bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500/50 text-zinc-200 appearance-none cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
    </div>
  );
}
