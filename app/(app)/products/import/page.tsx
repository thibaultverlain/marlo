"use client";
import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, Download } from "lucide-react";
import { bulkImportProducts, type ImportRow } from "@/lib/actions/import";
import { useRouter } from "next/navigation";

const COLS = [
  { key: "title", label: "Titre", req: true }, { key: "brand", label: "Marque", req: true },
  { key: "model", label: "Modèle", req: false }, { key: "category", label: "Catégorie", req: false },
  { key: "size", label: "Taille", req: false }, { key: "color", label: "Couleur", req: false },
  { key: "condition", label: "État", req: false }, { key: "purchasePrice", label: "Prix d'achat", req: true },
  { key: "targetPrice", label: "Prix visé", req: false }, { key: "purchaseSource", label: "Source", req: false },
  { key: "purchaseDate", label: "Date achat", req: false }, { key: "notes", label: "Notes", req: false },
];

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  return lines.slice(1).map((line) => {
    const values: string[] = []; let cur = "", inQ = false;
    for (const ch of line) { if (ch === '"') inQ = !inQ; else if (ch === "," && !inQ) { values.push(cur.trim()); cur = ""; } else cur += ch; }
    values.push(cur.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (values[i] ?? "").replace(/^"|"$/g, ""); });
    return row;
  });
}

function downloadTemplate() {
  const csv = `${COLS.map(c=>c.key).join(",")}\n"Chanel Classic Flap","Chanel","Classic Flap","sacs","Medium","Noir","tres_bon","2800","4200","Vente privée","2026-04-01",""`;
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = "marlo-template.csv"; a.click();
}

export default function ImportPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ imported: number; skipped: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return;
    setFileName(file.name); setParseError(null); setActionError(null); setSuccess(null);
    const reader = new FileReader();
    reader.onload = (evt) => { try { const r = parseCSV(evt.target?.result as string); if (r.length === 0) { setParseError("Fichier vide."); return; } setRows(r as ImportRow[]); } catch { setParseError("Erreur de lecture."); } };
    reader.readAsText(file);
  }

  function handleImport() {
    setActionError(null);
    startTransition(async () => {
      const result = await bulkImportProducts(rows);
      if ("error" in result && result.error) setActionError(result.error);
      else if ("imported" in result) { setSuccess({ imported: result.imported, skipped: result.skipped }); setTimeout(() => router.push("/products"), 2000); }
    });
  }

  const validCount = rows.filter((r) => r.title && r.brand && r.purchasePrice).length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 page-enter">
      <div className="flex items-center gap-4">
        <Link href="/products" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors"><ArrowLeft size={18} /></Link>
        <div><h1 className="text-2xl font-bold text-white tracking-tight">Importer</h1><p className="text-sm text-zinc-500 mt-0.5">CSV</p></div>
      </div>

      {success && <div className="flex items-start gap-2 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400"><CheckCircle size={16} className="flex-shrink-0 mt-0.5" /><div><p className="font-semibold">{success.imported} importé{success.imported>1?"s":""}</p><p className="text-[11px] text-emerald-500 mt-1">Redirection...</p></div></div>}
      {actionError && <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400"><AlertCircle size={16} className="flex-shrink-0 mt-0.5" /><span>{actionError}</span></div>}

      <div className="bg-zinc-800/50 rounded-xl p-5 flex items-start justify-between gap-4">
        <div><h2 className="font-semibold text-white text-sm">Template CSV</h2><p className="text-[12px] text-zinc-500 mt-1">Télécharge le modèle avec les colonnes attendues.</p></div>
        <button onClick={downloadTemplate} className="flex items-center gap-2 px-4 py-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] text-zinc-300 rounded-lg text-sm font-medium row-hover transition-colors flex-shrink-0"><Download size={14} />Télécharger</button>
      </div>

      <label className="block bg-[var(--color-bg-card)] rounded-xl border-2 border-dashed border-[var(--color-border)] p-8 text-center cursor-pointer hover:border-indigo-500/50 transition-all">
        <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
        <Upload size={32} className="mx-auto text-zinc-600" />
        <p className="text-sm text-zinc-300 mt-2 font-medium">{fileName || "Cliquer pour choisir"}</p>
        <p className="text-[11px] text-zinc-600 mt-1">CSV uniquement</p>
      </label>

      {parseError && <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400"><AlertCircle size={16} className="flex-shrink-0 mt-0.5" /><span>{parseError}</span></div>}

      {rows.length > 0 && !success && (
        <div className="card-static p-6">
          <div className="flex items-center justify-between mb-4"><h2 className="text-[15px] font-semibold text-white">Aperçu</h2><span className="text-sm text-emerald-400 font-medium">{validCount} valide{validCount>1?"s":""}</span></div>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead><tr className="border-b border-[var(--color-border)]"><th className="text-left py-2 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Titre</th><th className="text-left py-2 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Marque</th><th className="text-right py-2 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Achat</th><th className="text-right py-2 text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Visé</th></tr></thead>
              <tbody className="divide-y divide-[var(--color-border)]">{rows.slice(0,10).map((r, i) => { const ok=r.title&&r.brand&&r.purchasePrice; return <tr key={i} className={!ok?"opacity-30":""}><td className="py-2 text-zinc-200">{r.title||"—"}</td><td className="py-2 text-zinc-400">{r.brand||"—"}</td><td className="py-2 text-right text-zinc-400 tabular-nums">{r.purchasePrice?`${r.purchasePrice} €`:"—"}</td><td className="py-2 text-right text-zinc-400 tabular-nums">{r.targetPrice?`${r.targetPrice} €`:"—"}</td></tr>;})}</tbody>
            </table>
          </div>
          <div className="flex items-center justify-end mt-6 pt-4 border-t border-[var(--color-border)]">
            <button onClick={handleImport} disabled={isPending||validCount===0} className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors disabled:opacity-50"><FileText size={16}/>{isPending?"Import...":` Importer ${validCount} article${validCount>1?"s":""}`}</button>
          </div>
        </div>
      )}
      <div className="pb-8" />
    </div>
  );
}
