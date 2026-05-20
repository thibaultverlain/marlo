import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

export const metadata = {
  title: "Tarifs - Marlo",
  description: "Marlo Pro - 29€/mois ou 290€/an. Gestion complete pour revendeurs de luxe.",
};

const FEATURES = [
  "Stock illimite + photos",
  "Ventes multi-canaux (Vinted, Vestiaire, StockX...)",
  "Clients VIP avec historique complet",
  "Sourcing et Personal Shopping",
  "Factures conformes (RGPD + comptabilite francaise)",
  "Comptabilite : livre recettes + registre achats",
  "Analytique avancee (marges, saisonnalite, dormants)",
  "Templates messages reutilisables",
  "Equipe + permissions granulaires",
  "Application mobile",
  "Export Excel partout",
  "Securite et hebergement Europe",
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <Link href="/" className="inline-flex items-center gap-2 text-rose-400 hover:text-rose-300 transition mb-6">
            ← Retour
          </Link>
          <h1 className="text-3xl lg:text-5xl font-bold text-white tracking-tight">Un seul plan, simple.</h1>
          <p className="text-zinc-400 mt-3 text-base lg:text-lg">14 jours d'essai gratuit, sans carte bancaire.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
          {/* Mensuel */}
          <div className="card-static p-6 lg:p-8">
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-white">Mensuel</h2>
            </div>
            <div className="mt-4">
              <span className="text-[42px] font-bold text-white tabular-nums">29€</span>
              <span className="text-zinc-500 ml-1">/mois</span>
            </div>
            <p className="text-[12px] text-zinc-500 mt-1">Engagement mois par mois</p>
            <Link
              href="/auth?plan=mensuel"
              className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 text-[14px] font-semibold text-zinc-300 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
            >
              Commencer l'essai
            </Link>
          </div>

          {/* Annuel */}
          <div className="card-static p-6 lg:p-8 border-rose-500/30 relative" style={{ background: "linear-gradient(180deg, rgba(225,29,72,0.04), transparent)" }}>
            <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 bg-rose-500 rounded-full text-[10px] font-semibold text-white">
              -17%
            </div>
            <div className="flex items-center gap-2">
              <h2 className="text-[15px] font-semibold text-white">Annuel</h2>
              <Sparkles size={13} className="text-rose-400" />
            </div>
            <div className="mt-4">
              <span className="text-[42px] font-bold text-white tabular-nums">24€</span>
              <span className="text-zinc-500 ml-1">/mois</span>
            </div>
            <p className="text-[12px] text-zinc-500 mt-1">290€ facture annuellement</p>
            <Link
              href="/auth?plan=annuel"
              className="mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 text-[14px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"
            >
              Commencer l'essai
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-12 max-w-3xl mx-auto">
          <h2 className="text-[13px] font-semibold text-zinc-400 uppercase tracking-wider mb-5 text-center">Tout est inclus</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                  <Check size={11} className="text-emerald-400" />
                </div>
                <span className="text-[13px] text-zinc-300">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <p className="text-[12px] text-zinc-600">
            Pas de carte bancaire requise pour demarrer. Annulation a tout moment depuis ton espace.
          </p>
        </div>
      </div>
    </div>
  );
}
