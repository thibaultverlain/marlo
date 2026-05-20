import Link from "next/link";
import { Sparkles, AlertCircle } from "lucide-react";
import type { SubscriptionState } from "@/lib/db/queries/subscriptions";

export default function TrialBanner({ state }: { state: SubscriptionState }) {
  // Show banner only in specific cases
  if (state.status === "bypassed") return null;
  if (state.status === "active" && !state.cancelAtPeriodEnd) return null;

  // Trial ending soon
  if (state.status === "trialing" && state.trialDaysLeft !== null && state.trialDaysLeft <= 5) {
    return (
      <Link
        href="/billing"
        className="block mb-4 px-4 py-2.5 rounded-lg bg-amber-500/[0.08] border border-amber-500/20 hover:bg-amber-500/[0.12] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Sparkles size={14} className="text-amber-400 flex-shrink-0" />
          <p className="text-[12px] text-amber-300 flex-1">
            <span className="font-semibold">Essai gratuit : {state.trialDaysLeft} jour{state.trialDaysLeft > 1 ? "s" : ""} restant{state.trialDaysLeft > 1 ? "s" : ""}.</span>
            <span className="text-amber-400/70 ml-1.5 hidden sm:inline">Choisis ton plan pour continuer apres l'essai.</span>
          </p>
          <span className="text-[11px] text-amber-300 font-semibold whitespace-nowrap">Voir les plans →</span>
        </div>
      </Link>
    );
  }

  // Past due
  if (state.status === "past_due") {
    return (
      <Link
        href="/billing"
        className="block mb-4 px-4 py-2.5 rounded-lg bg-red-500/[0.08] border border-red-500/20 hover:bg-red-500/[0.12] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
          <p className="text-[12px] text-red-300 flex-1">
            <span className="font-semibold">Probleme de paiement.</span>
            <span className="text-red-400/70 ml-1.5">Mets a jour ta carte bancaire pour eviter une interruption.</span>
          </p>
          <span className="text-[11px] text-red-300 font-semibold whitespace-nowrap">Regler →</span>
        </div>
      </Link>
    );
  }

  // Cancel scheduled
  if (state.status === "active" && state.cancelAtPeriodEnd && state.currentPeriodEnd) {
    return (
      <Link
        href="/billing"
        className="block mb-4 px-4 py-2.5 rounded-lg bg-zinc-500/[0.08] border border-zinc-500/20 hover:bg-zinc-500/[0.12] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <AlertCircle size={14} className="text-zinc-400 flex-shrink-0" />
          <p className="text-[12px] text-zinc-300 flex-1">
            <span className="font-semibold">Annulation programmee</span>
            <span className="text-zinc-500 ml-1.5">jusqu'au {new Date(state.currentPeriodEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })}</span>
          </p>
          <span className="text-[11px] text-zinc-300 font-semibold whitespace-nowrap">Gerer →</span>
        </div>
      </Link>
    );
  }

  return null;
}
