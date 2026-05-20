import Link from "next/link";
import { getAuthContext } from "@/lib/auth/require-role";
import { getSubscriptionState } from "@/lib/db/queries/subscriptions";
import { CheckCircle2, AlertCircle, Crown, Clock, X } from "lucide-react";
import BillingActions from "@/components/billing/billing-actions";

export const dynamic = "force-dynamic";

const STATUS_BADGES: Record<string, { label: string; cl: string; icon: any }> = {
  trialing: { label: "Essai", cl: "bg-blue-500/15 text-blue-400 border-blue-500/20", icon: Clock },
  active: { label: "Actif", cl: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20", icon: CheckCircle2 },
  past_due: { label: "Paiement en attente", cl: "bg-amber-500/15 text-amber-400 border-amber-500/20", icon: AlertCircle },
  canceled: { label: "Annule", cl: "bg-red-500/15 text-red-400 border-red-500/20", icon: X },
  bypassed: { label: "Compte founder", cl: "bg-rose-500/15 text-rose-400 border-rose-500/20", icon: Crown },
  none: { label: "Aucun abonnement", cl: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20", icon: AlertCircle },
};

export default async function BillingPage({ searchParams }: { searchParams: Promise<{ success?: string; canceled?: string }> }) {
  const sp = await searchParams;
  const { shopId } = await getAuthContext();
  const state = await getSubscriptionState(shopId);
  const badge = STATUS_BADGES[state.status] ?? STATUS_BADGES.none;
  const BadgeIcon = badge.icon;

  return (
    <div className="max-w-3xl mx-auto space-y-6 page-enter">
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Abonnement</h1>
        <p className="text-zinc-500 mt-1 text-sm">Statut et gestion de ton abonnement Marlo</p>
      </div>

      {sp.success && (
        <div className="flex items-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-sm text-emerald-400">
          <CheckCircle2 size={16} />
          Paiement confirme. Bienvenue sur Marlo Pro.
        </div>
      )}
      {sp.canceled && (
        <div className="flex items-center gap-2 p-3 bg-zinc-500/10 border border-zinc-500/20 rounded-lg text-sm text-zinc-400">
          <X size={16} />
          Paiement annule. Tu peux reessayer quand tu veux.
        </div>
      )}

      {/* Status card */}
      <div className="card-static p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Statut</p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[13px] font-semibold border ${badge.cl}`}>
                <BadgeIcon size={13} />
                {badge.label}
              </span>
            </div>
          </div>
          {state.plan && (
            <div className="text-right">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Plan</p>
              <p className="text-[15px] font-semibold text-white mt-1">
                {state.plan === "annuel" ? "Annuel - 290€/an" : "Mensuel - 29€/mois"}
              </p>
            </div>
          )}
        </div>

        {state.status === "trialing" && state.trialDaysLeft !== null && (
          <div className="mt-5 pt-5 border-t border-[var(--color-border)]">
            <p className="text-[13px] text-zinc-300">
              Il te reste <span className="text-white font-bold">{state.trialDaysLeft} jour{state.trialDaysLeft > 1 ? "s" : ""}</span> d'essai gratuit.
            </p>
            {state.trialEndsAt && (
              <p className="text-[11px] text-zinc-500 mt-1">
                Fin de l'essai le {new Date(state.trialEndsAt).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
        )}

        {state.status === "active" && state.currentPeriodEnd && (
          <div className="mt-5 pt-5 border-t border-[var(--color-border)]">
            <p className="text-[13px] text-zinc-300">
              {state.cancelAtPeriodEnd ? "Annulation programmee. Acces jusqu'au" : "Prochain renouvellement le"} <span className="text-white font-bold">
                {new Date(state.currentPeriodEnd).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
              </span>
            </p>
          </div>
        )}

        {state.status === "bypassed" && (
          <div className="mt-5 pt-5 border-t border-[var(--color-border)]">
            <p className="text-[13px] text-zinc-300">
              Tu es le founder. Acces complet sans abonnement requis.
            </p>
          </div>
        )}
      </div>

      {/* Actions */}
      {state.status !== "bypassed" && (
        <BillingActions state={state} />
      )}
    </div>
  );
}
