"use client";

import { useState, useTransition } from "react";
import {
  Plus, FileText, MessageSquare, Mail, AlignLeft, Trash2, Pencil,
  X, Copy, Check,
} from "lucide-react";
import {
  createTemplateAction,
  updateTemplateAction,
  deleteTemplateAction,
} from "@/lib/actions/templates";
import type { Template } from "@/lib/db/schema";

const TYPE_CONFIG = {
  annonce: { label: "Annonce", icon: FileText, iconClass: "text-blue-400", bgClass: "bg-blue-500/10" },
  message: { label: "Message", icon: MessageSquare, iconClass: "text-violet-400", bgClass: "bg-violet-500/10" },
  email: { label: "Email", icon: Mail, iconClass: "text-cyan-400", bgClass: "bg-cyan-500/10" },
  description: { label: "Description", icon: AlignLeft, iconClass: "text-amber-400", bgClass: "bg-amber-500/10" },
} as const;

export default function TemplatesPageClient({
  templates,
  isOwner,
}: {
  templates: Template[];
  isOwner: boolean;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [type, setType] = useState<"annonce" | "message" | "email" | "description">("annonce");
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [variables, setVariables] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  function resetForm() {
    setName(""); setContent(""); setVariables(""); setType("annonce");
    setEditingId(null); setShowForm(false);
  }

  function startEdit(t: Template) {
    setEditingId(t.id);
    setType(t.type as any);
    setName(t.name);
    setContent(t.content);
    setVariables(t.variables ?? "");
    setShowForm(true);
  }

  function handleSave() {
    if (!name.trim() || !content.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("type", type);
      fd.set("name", name.trim());
      fd.set("content", content.trim());
      if (variables.trim()) fd.set("variables", variables.trim());

      const result = editingId
        ? await updateTemplateAction(editingId, fd)
        : await createTemplateAction(fd);

      if (result.error) setError(result.error);
      else resetForm();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => { await deleteTemplateAction(id); });
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  const filtered = filterType === "all" ? templates : templates.filter((t) => t.type === filterType);

  return (
    <>
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Templates</h1>
          <p className="text-zinc-500 mt-1 text-sm">{templates.length} template{templates.length > 1 ? "s" : ""}</p>
        </div>
        {isOwner && (
          <button onClick={() => { resetForm(); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-[#0a0a0f] bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors">
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
        <div className="card-static p-6 space-y-4">
          <div className="flex gap-2">
            {(["annonce", "message", "email", "description"] as const).map((t) => {
              const cfg = TYPE_CONFIG[t];
              const Icon = cfg.icon;
              return (
                <button key={t} onClick={() => setType(t)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                    type === t ? "border-rose-500/30 bg-rose-500/5 text-white" : "border-[var(--color-border)] text-zinc-500 hover:text-zinc-300"
                  }`}>
                  <Icon size={12} />
                  {cfg.label}
                </button>
              );
            })}
          </div>
          <input type="text" placeholder="Nom du template" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]" autoFocus />
          <textarea placeholder="Contenu du template... Utilisez {marque}, {modele}, {prix}, {taille} comme variables" value={content} onChange={(e) => setContent(e.target.value)} rows={6}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] resize-none font-mono" />
          <div className="flex gap-2 justify-end">
            <button onClick={resetForm} className="px-3 py-2 text-[13px] text-zinc-500 hover:text-zinc-300">Annuler</button>
            <button onClick={handleSave} disabled={isPending || !name.trim() || !content.trim()}
              className="px-4 py-2 text-[13px] font-semibold text-[#0a0a0f] bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors disabled:opacity-50">
              {isPending ? "..." : editingId ? "Enregistrer" : "Creer"}
            </button>
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex bg-zinc-800/60 rounded-lg p-0.5 w-fit">
        {[{ key: "all", label: "Tout" }, ...Object.entries(TYPE_CONFIG).map(([k, v]) => ({ key: k, label: v.label }))].map((f) => (
          <button key={f.key} onClick={() => setFilterType(f.key)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${
              filterType === f.key ? "bg-[rgba(251,113,133,0.12)] text-rose-400" : "text-zinc-500 hover:text-zinc-300"
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card-static p-12 text-center">
          <FileText size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm">Aucun template{filterType !== "all" ? ` de type ${filterType}` : ""}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => {
            const cfg = TYPE_CONFIG[t.type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.annonce;
            const Icon = cfg.icon;
            return (
              <div key={t.id} className="card-static p-5 group">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-xl ${cfg.bgClass} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={cfg.iconClass} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-medium text-white">{t.name}</p>
                      <span className="text-[10px] text-zinc-600 bg-zinc-800/60 px-1.5 py-0.5 rounded">{cfg.label}</span>
                    </div>
                    <pre className="text-[12px] text-zinc-400 mt-2 whitespace-pre-wrap font-mono leading-relaxed max-h-[120px] overflow-hidden">
                      {t.content}
                    </pre>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                    <button onClick={() => handleCopy(t.content, t.id)}
                      className="p-2 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.03] transition" title="Copier">
                      {copied === t.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                    {isOwner && (
                      <>
                        <button onClick={() => startEdit(t)}
                          className="p-2 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.03] transition" title="Modifier">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(t.id)}
                          className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition" title="Supprimer">
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
