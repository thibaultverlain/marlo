"use client";

import { useState, useMemo, useTransition } from "react";
import {
  Plus, FileText, MessageSquare, Trash2, Pencil, Copy as CopyIcon,
  X, Copy, Check, Wand2, AlertTriangle, Search, Users, Package,
  ChevronDown, ChevronUp, Lock,
} from "lucide-react";
import {
  createTemplateAction,
  updateTemplateAction,
  deleteTemplateAction,
  duplicateTemplateAction,
} from "@/lib/actions/templates";
import type { Template } from "@/lib/db/schema";

type ProductSlim = {
  id: string;
  sku: string;
  title: string;
  brand: string;
  color: string | null;
  size: string | null;
  condition: string;
  targetPrice: string | null;
};

const TYPE_CONFIG = {
  favoris: { label: "Messages favoris", short: "Favoris", icon: MessageSquare, iconClass: "text-rose-400", bgClass: "bg-rose-500/10" },
  litiges: { label: "Messages litiges", short: "Litiges", icon: AlertTriangle, iconClass: "text-red-400", bgClass: "bg-red-500/10" },
  sourcing: { label: "Sourcing / PS", short: "Sourcing", icon: Search, iconClass: "text-rose-400", bgClass: "bg-rose-500/10" },
  communaute: { label: "Communaute privee", short: "Communaute", icon: Users, iconClass: "text-emerald-400", bgClass: "bg-emerald-500/10" },
  annonces: { label: "Annonces plateforme", short: "Annonces", icon: FileText, iconClass: "text-amber-400", bgClass: "bg-amber-500/10" },
} as const;

function extractVariables(content: string): string[] {
  const matches = content.match(/\{(\w+)\}/g);
  if (!matches) return [];
  return [...new Set(matches.map((m) => m.slice(1, -1)))];
}

function fillTemplate(content: string, values: Record<string, string>): string {
  return content.replace(/\{(\w+)\}/g, (match, key) => values[key] || match);
}

function productToVariables(p: ProductSlim): Record<string, string> {
  return {
    marque: p.brand,
    modele: p.title,
    reference: p.sku,
    prix: p.targetPrice ?? "",
    taille: p.size ?? "",
    couleur: p.color ?? "",
    etat: p.condition,
  };
}

export default function TemplatesPageClient({
  templates,
  isOwner,
  products,
}: {
  templates: Template[];
  isOwner: boolean;
  products: ProductSlim[];
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<keyof typeof TYPE_CONFIG>("favoris");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [variables, setVariables] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const [filterType, setFilterType] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [previewId, setPreviewId] = useState<string | null>(null);
  const [varValues, setVarValues] = useState<Record<string, string>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [showProductPicker, setShowProductPicker] = useState(false);

  function resetForm() {
    setName(""); setContent(""); setVariables(""); setType("favoris");
    setEditingId(null); setShowForm(false);
  }

  function startEdit(t: Template) {
    setEditingId(t.id); setType(t.type as any); setName(t.name);
    setContent(t.content); setVariables(t.variables ?? ""); setShowForm(true);
  }

  function handleSave() {
    if (!name.trim() || !content.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("type", type); fd.set("name", name.trim());
      fd.set("content", content.trim());
      if (variables.trim()) fd.set("variables", variables.trim());
      const result = editingId ? await updateTemplateAction(editingId, fd) : await createTemplateAction(fd);
      if (result.error) setError(result.error); else resetForm();
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Supprimer ce template ?")) return;
    startTransition(async () => { await deleteTemplateAction(id); });
  }

  function handleDuplicate(id: string) {
    startTransition(async () => { await duplicateTemplateAction(id); });
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  function openPreview(t: Template) {
    if (previewId === t.id) { setPreviewId(null); return; }
    setPreviewId(t.id);
    const vars = extractVariables(t.content);
    const init: Record<string, string> = {};
    vars.forEach((v) => { init[v] = varValues[v] ?? ""; });
    setVarValues(init);
  }

  function handleCopyFilled(content: string) {
    const filled = fillTemplate(content, varValues);
    navigator.clipboard.writeText(filled);
    setCopied("filled-" + previewId);
    setTimeout(() => setCopied(null), 2000);
  }

  function loadFromProduct(product: ProductSlim) {
    setVarValues(productToVariables(product));
    setShowProductPicker(false);
    setProductSearch("");
  }

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products.slice(0, 8);
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) => p.title.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [products, productSearch]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: templates.length };
    Object.keys(TYPE_CONFIG).forEach((k) => {
      c[k] = templates.filter((t) => t.type === k).length;
    });
    return c;
  }, [templates]);

  const filtered = useMemo(() => {
    let list = templates;
    if (filterType !== "all") list = list.filter((t) => t.type === filterType);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((t) => t.name.toLowerCase().includes(q) || t.content.toLowerCase().includes(q));
    }
    return list;
  }, [templates, filterType, search]);

  return (
    <>
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Templates</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {templates.length} template{templates.length > 1 ? "s" : ""}
            {!isOwner && <span className="ml-2 text-zinc-500"><Lock size={10} className="inline mb-0.5" /> Lecture seule</span>}
          </p>
        </div>
        {isOwner && (
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors">
            <Plus size={14} />
            Nouveau
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {/* Form */}
      {showForm && isOwner && (
        <div className="card-static p-5 space-y-4">
          <div className="flex gap-1.5 flex-wrap">
            {(Object.entries(TYPE_CONFIG) as [keyof typeof TYPE_CONFIG, typeof TYPE_CONFIG[keyof typeof TYPE_CONFIG]][]).map(([t, cfg]) => {
              const Icon = cfg.icon;
              return (
                <button key={t} onClick={() => setType(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                    type === t ? "border-rose-500/30 bg-rose-500/5 text-white" : "border-[var(--color-border)] text-zinc-500 hover:text-zinc-300"
                  }`}>
                  <Icon size={12} />
                  {cfg.short}
                </button>
              );
            })}
          </div>
          <input type="text" placeholder="Nom du template" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500/50" autoFocus />
          <textarea placeholder={"Contenu du template...\nUtilise {marque}, {modele}, {prix}, {taille}, {couleur}, {etat}, {reference} comme variables"}
            value={content} onChange={(e) => setContent(e.target.value)} rows={8}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500/50 resize-none font-mono leading-relaxed" />
          {extractVariables(content).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-[11px] text-zinc-500 self-center">Variables detectees :</span>
              {extractVariables(content).map((v) => (
                <span key={v} className="text-[11px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 font-mono">{`{${v}}`}</span>
              ))}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="px-3 py-2 text-[13px] text-zinc-500 hover:text-zinc-300">Annuler</button>
            <button onClick={handleSave} disabled={isPending || !name.trim() || !content.trim()}
              className="px-4 py-2 text-[13px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors disabled:opacity-50">
              {isPending ? "..." : editingId ? "Enregistrer" : "Creer"}
            </button>
          </div>
        </div>
      )}

      {/* Filters with icons - scrollable on mobile */}
      <div className="flex bg-zinc-800/60 rounded-lg p-0.5 w-fit max-w-full overflow-x-auto">
        <button onClick={() => setFilterType("all")}
          className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all whitespace-nowrap ${
            filterType === "all" ? "bg-[var(--color-accent-muted)] text-rose-400" : "text-zinc-500 hover:text-zinc-300"
          }`}>
          Tous ({counts.all})
        </button>
        {(Object.entries(TYPE_CONFIG) as [keyof typeof TYPE_CONFIG, typeof TYPE_CONFIG[keyof typeof TYPE_CONFIG]][]).map(([k, v]) => {
          const Icon = v.icon;
          return (
            <button key={k} onClick={() => setFilterType(k)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-all whitespace-nowrap ${
                filterType === k ? "bg-[var(--color-accent-muted)] text-rose-400" : "text-zinc-500 hover:text-zinc-300"
              }`}>
              <Icon size={11} />
              {v.short} ({counts[k]})
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
        <input
          type="text"
          placeholder="Rechercher (nom, contenu)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-[13px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500/50 text-zinc-200 placeholder:text-zinc-500"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card-static p-12 text-center">
          <FileText size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm">Aucun template trouve</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const cfg = TYPE_CONFIG[t.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.favoris;
            const Icon = cfg.icon;
            const isPreview = previewId === t.id;
            const isExpanded = expandedId === t.id;
            const vars = extractVariables(t.content);
            const isLongContent = t.content.length > 200;

            return (
              <div key={t.id} className="card-static overflow-hidden">
                <div className="p-4 sm:p-5">
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-xl ${cfg.bgClass} flex items-center justify-center flex-shrink-0`}>
                      <Icon size={18} className={cfg.iconClass} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[14px] font-medium text-white">{t.name}</p>
                        <span className="text-[10px] text-zinc-500 bg-zinc-800/60 px-1.5 py-0.5 rounded">{cfg.short}</span>
                        {vars.length > 0 && (
                          <span className="text-[10px] text-zinc-500">{vars.length} variable{vars.length > 1 ? "s" : ""}</span>
                        )}
                      </div>
                      <pre className={`text-[12px] text-zinc-400 mt-2 whitespace-pre-wrap font-mono leading-relaxed ${isExpanded ? "" : "max-h-[80px] overflow-hidden"}`}>
                        {t.content}
                      </pre>
                      {isLongContent && (
                        <button onClick={() => setExpandedId(isExpanded ? null : t.id)}
                          className="text-[11px] text-zinc-500 hover:text-rose-400 mt-1 flex items-center gap-1 transition">
                          {isExpanded ? <><ChevronUp size={11} /> Reduire</> : <><ChevronDown size={11} /> Voir tout</>}
                        </button>
                      )}
                    </div>
                    {/* Actions ALWAYS visible */}
                    <div className="flex items-center gap-0.5 flex-shrink-0">
                      {vars.length > 0 && (
                        <button onClick={() => openPreview(t)}
                          className={`p-2 rounded-lg transition ${isPreview ? "bg-rose-500/10 text-rose-400" : "text-zinc-500 hover:text-zinc-200 hover:bg-[var(--color-bg-hover)]"}`}
                          title="Remplir variables">
                          <Wand2 size={14} />
                        </button>
                      )}
                      <button onClick={() => handleCopy(t.content, t.id)}
                        className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-[var(--color-bg-hover)] transition" title="Copier">
                        {copied === t.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                      {isOwner && (
                        <>
                          <button onClick={() => handleDuplicate(t.id)}
                            className="hidden sm:flex p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-[var(--color-bg-hover)] transition" title="Dupliquer">
                            <CopyIcon size={14} />
                          </button>
                          <button onClick={() => startEdit(t)}
                            className="p-2 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-[var(--color-bg-hover)] transition" title="Modifier">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(t.id)}
                            className="p-2 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition" title="Supprimer">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Preview / fill panel */}
                {isPreview && vars.length > 0 && (
                  <div className="border-t border-[var(--color-border)] p-4 sm:p-5 bg-[var(--color-bg)]/30">
                    {/* Load from product */}
                    {products.length > 0 && (
                      <div className="mb-4">
                        <button
                          onClick={() => setShowProductPicker(!showProductPicker)}
                          className="flex items-center gap-1.5 text-[12px] font-medium text-rose-400 hover:text-rose-300 transition"
                        >
                          <Package size={12} />
                          Charger depuis un article
                          <ChevronDown size={11} className={`transition-transform ${showProductPicker ? "rotate-180" : ""}`} />
                        </button>
                        {showProductPicker && (
                          <div className="mt-2 p-3 rounded-lg bg-[var(--color-bg-card)] border border-[var(--color-border)]">
                            <input
                              type="text"
                              placeholder="Rechercher un article..."
                              value={productSearch}
                              onChange={(e) => setProductSearch(e.target.value)}
                              autoFocus
                              className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded px-3 py-1.5 text-[12px] text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500/50 mb-2"
                            />
                            <div className="max-h-[180px] overflow-y-auto space-y-0.5">
                              {filteredProducts.length === 0 ? (
                                <p className="text-[11px] text-zinc-500 px-2 py-2 text-center">Aucun article</p>
                              ) : (
                                filteredProducts.map((p) => (
                                  <button
                                    key={p.id}
                                    onClick={() => loadFromProduct(p)}
                                    className="w-full text-left p-2 rounded hover:bg-[var(--color-bg-hover)] transition"
                                  >
                                    <p className="text-[12px] text-zinc-200 truncate">{p.title}</p>
                                    <p className="text-[10px] text-zinc-500">{p.brand} · {p.sku}</p>
                                  </button>
                                ))
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                      {vars.map((v) => (
                        <div key={v}>
                          <label className="text-[11px] text-zinc-500 font-medium block mb-1">{v}</label>
                          <input type="text" value={varValues[v] ?? ""} onChange={(e) => setVarValues((prev) => ({ ...prev, [v]: e.target.value }))}
                            placeholder={v}
                            className="w-full bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-white placeholder:text-zinc-700 focus:outline-none focus:ring-1 focus:ring-rose-500/50" />
                        </div>
                      ))}
                    </div>
                    <div className="rounded-xl bg-[var(--color-bg-card)] border border-[var(--color-border)] p-4 mb-3">
                      <pre className="text-[13px] text-white whitespace-pre-wrap font-mono leading-relaxed">
                        {fillTemplate(t.content, varValues)}
                      </pre>
                    </div>
                    <div className="flex justify-end">
                      <button onClick={() => handleCopyFilled(t.content)}
                        className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors">
                        {copied === "filled-" + t.id ? <Check size={14} /> : <Copy size={14} />}
                        {copied === "filled-" + t.id ? "Copie !" : "Copier le texte rempli"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
