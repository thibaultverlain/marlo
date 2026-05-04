"use client";

import { useState, useTransition, useRef } from "react";
import Link from "next/link";
import {
  ArrowLeft, Plus, FolderOpen, Trash2, X, Upload,
  Building2, Shield, FileCheck, Landmark, ExternalLink, FileText,
} from "lucide-react";
import { addDocumentAction, deleteDocumentAction } from "@/lib/actions/documents";
import type { Doc } from "@/lib/db/queries/documents";

const CATEGORIES = [
  { value: "legal", label: "Documents legaux", icon: Building2, iconClass: "text-blue-400", bgClass: "bg-blue-500/10" },
  { value: "insurance", label: "Assurances", icon: Shield, iconClass: "text-emerald-400", bgClass: "bg-emerald-500/10" },
  { value: "contracts", label: "Contrats", icon: FileCheck, iconClass: "text-violet-400", bgClass: "bg-violet-500/10" },
  { value: "banking", label: "Banque", icon: Landmark, iconClass: "text-amber-400", bgClass: "bg-amber-500/10" },
  { value: "other", label: "Autre", icon: FolderOpen, iconClass: "text-zinc-400", bgClass: "bg-zinc-500/10" },
];

function formatSize(bytes: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export default function DocumentsPageClient({ documents }: { documents: Doc[] }) {
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState("legal");
  const [name, setName] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [filterCat, setFilterCat] = useState("all");
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleUpload() {
    if (!selectedFile || !name.trim()) return;
    setUploading(true);
    setError(null);

    try {
      // Upload file
      const fd = new FormData();
      fd.append("file", selectedFile);
      const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || uploadData.error) {
        setError(uploadData.error || "Erreur upload");
        setUploading(false);
        return;
      }

      // Save document record
      startTransition(async () => {
        const result = await addDocumentAction({
          category,
          name: name.trim(),
          fileName: uploadData.fileName,
          fileUrl: uploadData.url,
          fileSize: uploadData.fileSize,
          mimeType: uploadData.mimeType,
          expiresAt: expiresAt || undefined,
        });
        if (result.error) setError(result.error);
        else {
          setName(""); setExpiresAt(""); setSelectedFile(null);
          setShowForm(false);
          if (fileRef.current) fileRef.current.value = "";
        }
        setUploading(false);
      });
    } catch (e: any) {
      setError(e.message || "Erreur");
      setUploading(false);
    }
  }

  function handleDelete(id: string) {
    startTransition(async () => { await deleteDocumentAction(id); });
  }

  const filtered = filterCat === "all" ? documents : documents.filter((d) => d.category === filterCat);

  return (
    <>
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/admin" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors">
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Documents</h1>
            <p className="text-zinc-500 mt-1 text-sm">{documents.length} document{documents.length > 1 ? "s" : ""}</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-[#0a0a0f] bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors">
          <Plus size={14} />
          Ajouter
        </button>
      </div>

      {error && (
        <div className="rounded-xl px-4 py-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)}><X size={14} /></button>
        </div>
      )}

      {showForm && (
        <div className="card-static p-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              return (
                <button key={c.value} onClick={() => setCategory(c.value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-all ${
                    category === c.value ? "border-rose-500/30 bg-rose-500/5 text-white" : "border-[var(--color-border)] text-zinc-500 hover:text-zinc-300"
                  }`}>
                  <Icon size={12} />{c.label}
                </button>
              );
            })}
          </div>

          <input type="text" placeholder="Nom du document (ex: Kbis 2025)" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]" autoFocus />

          {/* File upload zone */}
          <div
            onClick={() => fileRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              selectedFile
                ? "border-rose-500/30 bg-rose-500/[0.02]"
                : "border-[var(--color-border)] hover:border-[var(--color-border-hover)] hover:bg-white/[0.01]"
            }`}
          >
            <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) { setSelectedFile(f); if (!name.trim()) setName(f.name.replace(/\.\w+$/, "")); }
              }} />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText size={20} className="text-rose-400" />
                <div className="text-left">
                  <p className="text-[13px] text-white font-medium">{selectedFile.name}</p>
                  <p className="text-[11px] text-zinc-500">{formatSize(selectedFile.size)}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); setSelectedFile(null); if (fileRef.current) fileRef.current.value = ""; }}
                  className="p-1 rounded hover:bg-red-500/10 text-zinc-500 hover:text-red-400"><X size={14} /></button>
              </div>
            ) : (
              <>
                <Upload size={24} className="mx-auto text-zinc-600 mb-2" />
                <p className="text-[13px] text-zinc-400">Cliquez pour choisir un fichier</p>
                <p className="text-[11px] text-zinc-600 mt-1">PDF, images, Word, Excel - Max 10 Mo</p>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            <label className="text-[12px] text-zinc-500">Expiration :</label>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
              className="bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]" />
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setSelectedFile(null); }}
              className="px-3 py-2 text-[13px] text-zinc-500 hover:text-zinc-300">Annuler</button>
            <button onClick={handleUpload} disabled={uploading || isPending || !name.trim() || !selectedFile}
              className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-[#0a0a0f] bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors disabled:opacity-50">
              {uploading ? (
                <><div className="w-3.5 h-3.5 border-2 border-[#0a0a0f] border-t-transparent rounded-full animate-spin" /> Upload...</>
              ) : (
                <><Upload size={14} /> Envoyer</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex bg-zinc-800/60 rounded-lg p-0.5 w-fit flex-wrap">
        <button onClick={() => setFilterCat("all")}
          className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${filterCat === "all" ? "bg-[rgba(251,113,133,0.12)] text-rose-400" : "text-zinc-500 hover:text-zinc-300"}`}>
          Tout
        </button>
        {CATEGORIES.map((c) => (
          <button key={c.value} onClick={() => setFilterCat(c.value)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${filterCat === c.value ? "bg-[rgba(251,113,133,0.12)] text-rose-400" : "text-zinc-500 hover:text-zinc-300"}`}>
            {c.label}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card-static p-12 text-center">
          <FolderOpen size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm">Aucun document</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((doc) => {
            const cat = CATEGORIES.find((c) => c.value === doc.category) ?? CATEGORIES[4];
            const Icon = cat.icon;
            const expired = doc.expiresAt && new Date(doc.expiresAt) < new Date();
            return (
              <div key={doc.id} className="card-static p-4 flex items-center gap-3 group">
                <div className={`w-10 h-10 rounded-xl ${cat.bgClass} flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} className={cat.iconClass} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-white truncate">{doc.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-zinc-500">{cat.label}</span>
                    {doc.fileSize && <span className="text-[11px] text-zinc-600">{formatSize(doc.fileSize)}</span>}
                    {doc.expiresAt && (
                      <span className={`text-[11px] ${expired ? "text-red-400" : "text-zinc-600"}`}>
                        {expired ? "Expire" : `Exp. ${new Date(doc.expiresAt).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}`}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                  <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="p-2 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.03] transition" title="Ouvrir">
                    <ExternalLink size={14} />
                  </a>
                  <button onClick={() => handleDelete(doc.id)} disabled={isPending}
                    className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-red-500/10 transition" title="Supprimer">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
