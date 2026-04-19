"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Mail, ArrowLeft, CheckCircle, AlertCircle, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { useRouter } from "next/navigation";

export default function ImportEmailPage() {
  const router = useRouter();
  const [subject, setSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/email-parse", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ subject, emailBody }),
        });
        const data = await res.json();

        if (!res.ok || data.error) {
          setError(data.error ?? "Erreur inconnue");
        } else {
          setResult(data.sale);
        }
      } catch {
        setError("Erreur réseau");
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl text-white">Import depuis un email</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Colle un email de confirmation Vinted ou Vestiaire Collective
          </p>
        </div>
      </div>

      <div className="bg-indigo-500/[0.06] border border-indigo-500/20 rounded-xl p-5">
        <div className="flex items-start gap-3">
          <Zap size={16} className="text-indigo-400 mt-0.5" />
          <div>
            <p className="text-sm text-indigo-300 font-medium">Comment faire ?</p>
            <p className="text-[12px] text-indigo-400/70 mt-1">
              Quand tu vends un article sur Vinted ou Vestiaire Collective, tu reçois un email de confirmation.
              Copie-colle l'objet et le contenu de cet email ci-dessous. Marlo détectera automatiquement
              la plateforme, le prix, les frais et créera la vente.
              Si l'article est dans ton stock, il sera automatiquement lié.
            </p>
          </div>
        </div>
      </div>

      {result && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <CheckCircle size={16} className="text-emerald-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-emerald-300 font-medium">Vente importée</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[13px]">
                <div>
                  <p className="text-zinc-500 text-[11px]">Article</p>
                  <p className="text-zinc-200">{result.productTitle}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-[11px]">Plateforme</p>
                  <p className="text-zinc-200 capitalize">{result.platform}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-[11px]">Prix de vente</p>
                  <p className="text-white font-semibold tabular-nums">{formatCurrency(result.salePrice)}</p>
                </div>
                <div>
                  <p className="text-zinc-500 text-[11px]">Marge</p>
                  <p className={`font-semibold tabular-nums ${result.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {formatCurrency(result.margin)}
                  </p>
                </div>
              </div>
              {!result.matched && (
                <p className="text-[11px] text-amber-400 mt-3">
                  Aucun article correspondant trouvé dans ton stock. La vente a été créée sans lien produit.
                </p>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setResult(null); setSubject(""); setEmailBody(""); }}
                  className="px-3 py-1.5 text-[13px] text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Importer un autre
                </button>
                <Link
                  href="/sales"
                  className="px-3 py-1.5 text-[13px] font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
                >
                  Voir les ventes
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {!result && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6 space-y-5">
            <div>
              <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                Objet de l'email
              </label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Félicitations, votre article a été vendu !"
                className="w-full px-3 py-2.5 text-[13px] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-zinc-200 placeholder:text-zinc-600"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1.5">
                Contenu de l'email *
              </label>
              <textarea
                required
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                rows={12}
                placeholder="Colle ici le contenu complet de l'email de confirmation de vente..."
                className="w-full px-3 py-2.5 text-[13px] bg-[var(--color-bg-raised)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500/50 text-zinc-200 placeholder:text-zinc-600 resize-none font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pb-8">
            <Link href="/dashboard" className="px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors">
              Annuler
            </Link>
            <button
              type="submit"
              disabled={isPending || !emailBody}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors disabled:opacity-50"
            >
              <Mail size={16} />
              {isPending ? "Analyse..." : "Analyser et importer"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
