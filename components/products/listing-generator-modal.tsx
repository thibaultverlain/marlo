"use client";

import { useState } from "react";
import { X, Sparkles, Loader2, AlertCircle, Check, Copy, RefreshCw, Image as ImageIcon } from "lucide-react";

const PLATFORMS = [
  {
    id: "vinted" as const,
    label: "Vinted",
    color: "#09B1BA",
    description: "Casual, accessible, mass market",
  },
  {
    id: "vestiaire" as const,
    label: "Vestiaire Collective",
    color: "#000000",
    description: "Luxe, expert, authentification",
  },
];

export default function ListingGeneratorModal({
  productId,
  hasImages,
  open,
  onClose,
}: {
  productId: string;
  hasImages: boolean;
  open: boolean;
  onClose: () => void;
}) {
  const [platform, setPlatform] = useState<"vinted" | "vestiaire">("vinted");
  const [useImages, setUseImages] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ title: string; description: string } | null>(null);
  const [copiedField, setCopiedField] = useState<"title" | "description" | null>(null);

  async function generate() {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch(`/api/products/${productId}/generate-listing`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, useImages: hasImages && useImages }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur de generation");

      setResult({ title: data.title, description: data.description });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function copy(text: string, field: "title" | "description") {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  function resetAll() {
    setResult(null);
    setError(null);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <Sparkles size={15} className="text-rose-400" />
            </div>
            <div>
              <h3 className="text-[15px] font-semibold text-white">Generateur d'annonce</h3>
              <p className="text-[11px] text-zinc-500">Titre et description optimises par IA</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--color-bg-hover)] text-zinc-500 hover:text-zinc-300">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
            <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
          {!result && !loading && (
            <>
              {/* Platform selection */}
              <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-2">Plateforme</p>
              <div className="grid grid-cols-2 gap-3 mb-5">
                {PLATFORMS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPlatform(p.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      platform === p.id
                        ? "border-rose-400 bg-rose-500/5"
                        : "border-[var(--color-border)] hover:border-[var(--color-border-hover)]"
                    }`}
                  >
                    <p className="text-[14px] font-semibold text-white">{p.label}</p>
                    <p className="text-[11px] text-zinc-500 mt-1">{p.description}</p>
                  </button>
                ))}
              </div>

              {/* Image option */}
              {hasImages && (
                <label className="flex items-start gap-3 p-3 rounded-lg bg-[var(--color-bg-hover)] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useImages}
                    onChange={(e) => setUseImages(e.target.checked)}
                    className="mt-0.5 rounded border-[var(--color-border)] bg-[var(--color-bg)] text-rose-500 focus:ring-rose-500"
                  />
                  <div>
                    <p className="text-[13px] text-white font-medium flex items-center gap-2">
                      <ImageIcon size={12} className="text-rose-400" />
                      Analyser les photos
                    </p>
                    <p className="text-[11px] text-zinc-500 mt-0.5">
                      L'IA examine les photos pour ajouter des details visuels precis (recommande)
                    </p>
                  </div>
                </label>
              )}

              {!hasImages && (
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/15">
                  <AlertCircle size={12} className="text-amber-400 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-amber-300/80">
                    Aucune photo. Generation basee uniquement sur les infos du produit. Ajoute des photos pour un meilleur resultat.
                  </p>
                </div>
              )}

              <button
                onClick={generate}
                className="mt-5 w-full flex items-center justify-center gap-2 px-4 py-3 text-[14px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"
              >
                <Sparkles size={14} />
                Generer
              </button>

              <p className="text-[10px] text-zinc-600 mt-3 text-center">
                {hasImages && useImages ? "Avec analyse photo : 10-20 secondes" : "Sans analyse photo : 3-5 secondes"}
              </p>
            </>
          )}

          {loading && (
            <div className="py-16 text-center">
              <Loader2 size={36} className="text-rose-400 animate-spin inline-block" />
              <p className="text-[14px] font-semibold text-white mt-4">
                {useImages && hasImages ? "Analyse des photos et generation..." : "Generation en cours..."}
              </p>
              <p className="text-[12px] text-zinc-500 mt-1">
                {useImages && hasImages ? "10-20 secondes" : "3-5 secondes"}
              </p>
            </div>
          )}

          {result && (
            <>
              <p className="text-[11px] text-zinc-500 mb-3">
                Annonce pour <span className="text-white font-semibold">{PLATFORMS.find((p) => p.id === platform)?.label}</span>
              </p>

              {/* Title */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Titre ({result.title.length} car.)</p>
                  <button
                    onClick={() => copy(result.title, "title")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      copiedField === "title"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-[var(--color-bg-hover)] text-zinc-400 hover:text-white"
                    }`}
                  >
                    {copiedField === "title" ? <Check size={11} /> : <Copy size={11} />}
                    {copiedField === "title" ? "Copie !" : "Copier"}
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-[var(--color-bg-raised)] border border-[var(--color-border)]">
                  <p className="text-[14px] text-white font-medium">{result.title}</p>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">Description ({result.description.length} car.)</p>
                  <button
                    onClick={() => copy(result.description, "description")}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-all ${
                      copiedField === "description"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-[var(--color-bg-hover)] text-zinc-400 hover:text-white"
                    }`}
                  >
                    {copiedField === "description" ? <Check size={11} /> : <Copy size={11} />}
                    {copiedField === "description" ? "Copie !" : "Copier"}
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-[var(--color-bg-raised)] border border-[var(--color-border)] max-h-[300px] overflow-y-auto">
                  <p className="text-[13px] text-zinc-200 whitespace-pre-wrap leading-relaxed">{result.description}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={resetAll}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[13px] font-medium text-zinc-300 bg-[var(--color-bg-hover)] rounded-lg hover:text-white transition-colors"
                >
                  <RefreshCw size={12} />
                  Regenerer
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-3 py-2 text-[13px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"
                >
                  Termine
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
