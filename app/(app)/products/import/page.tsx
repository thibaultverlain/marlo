"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, FileText, CheckCircle, AlertCircle, Download } from "lucide-react";
import { bulkImportProducts, type ImportRow } from "@/lib/actions/import";
import { useRouter } from "next/navigation";

const EXPECTED_COLUMNS = [
  { key: "title", label: "Titre", required: true, example: "Chanel Classic Flap Medium Noir" },
  { key: "brand", label: "Marque", required: true, example: "Chanel" },
  { key: "model", label: "Modèle", required: false, example: "Classic Flap" },
  { key: "category", label: "Catégorie", required: false, example: "sacs | chaussures | vetements | accessoires | montres | bijoux | autre" },
  { key: "size", label: "Taille", required: false, example: "Medium" },
  { key: "color", label: "Couleur", required: false, example: "Noir" },
  { key: "condition", label: "État", required: false, example: "tres_bon | bon | neuf_avec_etiquettes | ..." },
  { key: "purchasePrice", label: "Prix d'achat", required: true, example: "2800" },
  { key: "targetPrice", label: "Prix de vente visé", required: false, example: "4200" },
  { key: "purchaseSource", label: "Source d'achat", required: false, example: "Vente privée" },
  { key: "purchaseDate", label: "Date d'achat", required: false, example: "2026-04-01" },
  { key: "notes", label: "Notes", required: false, example: "..." },
];

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let j = 0; j < lines[i].length; j++) {
      const char = lines[i][j];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] ?? "").replace(/^"|"$/g, "");
    });
    rows.push(row);
  }

  return rows;
}

function downloadTemplate() {
  const headers = EXPECTED_COLUMNS.map((c) => c.key).join(",");
  const example = `"Chanel Classic Flap Medium","Chanel","Classic Flap","sacs","Medium","Noir","tres_bon","2800","4200","Vente privée","2026-04-01","Achetée à la vente privée d'avril"`;
  const csv = `${headers}\n${example}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "marlo-template-import.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ImportPage() {
  const router = useRouter();
  const [parsedRows, setParsedRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ imported: number; skipped: number } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParseError(null);
    setActionError(null);
    setSuccess(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string;
        const rows = parseCSV(text);
        if (rows.length === 0) {
          setParseError("Fichier vide ou illisible.");
          return;
        }
        setParsedRows(rows as ImportRow[]);
      } catch (err) {
        setParseError("Erreur lors de la lecture du fichier.");
      }
    };
    reader.readAsText(file);
  }

  function handleImport() {
    setActionError(null);
    startTransition(async () => {
      const result = await bulkImportProducts(parsedRows);
      if ("error" in result && result.error) {
        setActionError(result.error);
      } else if ("imported" in result) {
        setSuccess({ imported: result.imported, skipped: result.skipped });
        setTimeout(() => router.push("/products"), 2000);
      }
    });
  }

  const validCount = parsedRows.filter((r) => r.title && r.brand && r.purchasePrice).length;
  const invalidCount = parsedRows.length - validCount;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products" className="w-9 h-9 flex items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:text-stone-600 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl text-stone-900">Importer depuis un fichier</h1>
          <p className="text-sm text-stone-400 mt-0.5">CSV ou Excel exporté en CSV</p>
        </div>
      </div>

      {success && (
        <div className="flex items-start gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
          <CheckCircle size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">{success.imported} article{success.imported > 1 ? "s" : ""} importé{success.imported > 1 ? "s" : ""}</p>
            {success.skipped > 0 && <p className="text-xs mt-0.5">{success.skipped} ligne{success.skipped > 1 ? "s" : ""} ignorée{success.skipped > 1 ? "s" : ""} (données manquantes)</p>}
            <p className="text-xs mt-1 text-green-600">Redirection vers le stock...</p>
          </div>
        </div>
      )}

      {actionError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Template download */}
      <div className="bg-stone-900 rounded-xl p-5 text-white">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold mb-1">Template CSV</h2>
            <p className="text-sm text-stone-400">
              Télécharge le modèle pour voir les colonnes attendues et copie tes données dedans.
            </p>
          </div>
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-white text-stone-900 rounded-lg text-sm font-medium hover:bg-stone-100 transition-colors flex-shrink-0"
          >
            <Download size={14} />
            Télécharger
          </button>
        </div>
      </div>

      {/* Expected columns */}
      <div className="bg-white rounded-xl border border-stone-200/60 p-6">
        <h2 className="text-lg text-stone-900 mb-4">Colonnes attendues</h2>
        <div className="space-y-2">
          {EXPECTED_COLUMNS.map((col) => (
            <div key={col.key} className="flex items-center gap-3 text-sm">
              <code className="px-2 py-0.5 bg-stone-100 rounded text-xs text-stone-700 font-mono">{col.key}</code>
              <span className="text-stone-600">{col.label}</span>
              {col.required && <span className="text-[10px] text-red-500 bg-red-50 px-1.5 py-0.5 rounded">requis</span>}
              <span className="text-xs text-stone-400 truncate flex-1">{col.example}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upload zone */}
      <label className="block bg-white rounded-xl border border-stone-200/60 border-dashed p-8 text-center cursor-pointer hover:border-amber-400 hover:bg-amber-50/30 transition-all">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
        />
        <Upload size={32} className="mx-auto text-stone-300" />
        <p className="text-sm text-stone-600 mt-2 font-medium">
          {fileName || "Cliquer pour choisir un fichier"}
        </p>
        <p className="text-xs text-stone-400 mt-1">Format CSV uniquement</p>
      </label>

      {parseError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{parseError}</span>
        </div>
      )}

      {/* Preview */}
      {parsedRows.length > 0 && !success && (
        <div className="bg-white rounded-xl border border-stone-200/60 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg text-stone-900">Aperçu</h2>
            <div className="text-sm">
              <span className="text-green-600 font-medium">{validCount} valide{validCount > 1 ? "s" : ""}</span>
              {invalidCount > 0 && (
                <span className="text-amber-600 ml-2">· {invalidCount} ignorée{invalidCount > 1 ? "s" : ""}</span>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100">
                  <th className="text-left py-2 text-xs font-medium text-stone-400 uppercase tracking-wider">Titre</th>
                  <th className="text-left py-2 text-xs font-medium text-stone-400 uppercase tracking-wider">Marque</th>
                  <th className="text-right py-2 text-xs font-medium text-stone-400 uppercase tracking-wider">Achat</th>
                  <th className="text-right py-2 text-xs font-medium text-stone-400 uppercase tracking-wider">Visé</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {parsedRows.slice(0, 10).map((row, i) => {
                  const isValid = row.title && row.brand && row.purchasePrice;
                  return (
                    <tr key={i} className={!isValid ? "opacity-40" : ""}>
                      <td className="py-2 text-stone-800">{row.title || "—"}</td>
                      <td className="py-2 text-stone-600">{row.brand || "—"}</td>
                      <td className="py-2 text-right text-stone-600">{row.purchasePrice ? `${row.purchasePrice} €` : "—"}</td>
                      <td className="py-2 text-right text-stone-600">{row.targetPrice ? `${row.targetPrice} €` : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {parsedRows.length > 10 && (
              <p className="text-xs text-stone-400 text-center mt-3">
                ...et {parsedRows.length - 10} ligne{parsedRows.length - 10 > 1 ? "s" : ""} de plus
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-stone-100">
            <button
              onClick={handleImport}
              disabled={isPending || validCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
              <FileText size={16} />
              {isPending ? "Import en cours..." : `Importer ${validCount} article${validCount > 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}

      <div className="pb-8" />
    </div>
  );
}
