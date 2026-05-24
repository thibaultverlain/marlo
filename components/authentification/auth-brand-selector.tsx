"use client";

import { useState } from "react";
import { ChevronDown, Search, Plus } from "lucide-react";
import { BRAND_CHECKLISTS } from "@/lib/authentification/checklists";
import type { Product } from "@/lib/db/schema";

export default function AuthBrandSelector({
  products,
  defaultBrand,
  defaultModel,
  defaultProductId,
  onStart,
}: {
  products: Product[];
  defaultBrand?: string;
  defaultModel?: string;
  defaultProductId?: string;
  onStart: (brand: string, model: string, productId: string) => void;
}) {
  const [brand, setBrand] = useState(defaultBrand ?? "");
  const [model, setModel] = useState(defaultModel ?? "");
  const [productId, setProductId] = useState(defaultProductId ?? "");
  const [brandSearch, setBrandSearch] = useState("");

  const selectedBrand = BRAND_CHECKLISTS.find((b) => b.id === brand);
  const filteredBrands = BRAND_CHECKLISTS.filter((b) =>
    b.label.toLowerCase().includes(brandSearch.toLowerCase())
  );

  function handleStart() {
    if (!brand) return;
    onStart(brand, model, productId);
  }

  return (
    <div className="card-static p-6 space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">Marque</p>
        <div className="relative mb-3">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
          <input
            type="text"
            value={brandSearch}
            onChange={(e) => setBrandSearch(e.target.value)}
            placeholder="Rechercher une marque..."
            className="w-full pl-9 pr-4 py-2.5 bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg text-[13px] text-white placeholder-zinc-600 focus:outline-none focus:border-rose-500/50"
          />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {filteredBrands.map((b) => (
            <button
              key={b.id}
              onClick={() => { setBrand(b.id); setModel(""); }}
              className={`px-3 py-2.5 rounded-xl border text-[13px] font-medium text-left transition-all ${
                brand === b.id
                  ? "border-rose-500/60 bg-rose-500/8 text-white"
                  : "border-[var(--color-border)] text-zinc-400 hover:text-white hover:border-[var(--color-border-hover)]"
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      {selectedBrand && selectedBrand.models.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            Modele <span className="text-zinc-700 normal-case font-normal">(optionnel)</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <button
              onClick={() => setModel("")}
              className={`px-3 py-2.5 rounded-xl border text-[13px] text-left transition-all ${
                model === ""
                  ? "border-rose-500/60 bg-rose-500/8 text-white font-medium"
                  : "border-[var(--color-border)] text-zinc-500 hover:text-zinc-300"
              }`}
            >
              Tous modeles
            </button>
            {selectedBrand.models.map((m) => (
              <button
                key={m.id}
                onClick={() => setModel(m.id)}
                className={`px-3 py-2.5 rounded-xl border text-[13px] text-left transition-all ${
                  model === m.id
                    ? "border-rose-500/60 bg-rose-500/8 text-white font-medium"
                    : "border-[var(--color-border)] text-zinc-400 hover:text-white"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {products.length > 0 && brand && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 mb-3">
            Rattacher a un produit <span className="text-zinc-700 normal-case font-normal">(optionnel)</span>
          </p>
          <select
            value={productId}
            onChange={(e) => setProductId(e.target.value)}
            className="w-full px-3 py-2.5 bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg text-[13px] text-white focus:outline-none focus:border-rose-500/50 appearance-none"
          >
            <option value="">-- Aucun produit --</option>
            {products
              .filter((p) => !["vendu", "livre", "retourne"].includes(p.status))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.brand} {p.model ? `- ${p.model}` : ""} · {p.title}
                </option>
              ))}
          </select>
        </div>
      )}

      <button
        onClick={handleStart}
        disabled={!brand}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-rose-500 hover:bg-rose-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[14px] font-semibold rounded-xl transition-colors"
      >
        <Plus size={16} />
        Demarrer la verification
      </button>
    </div>
  );
}
