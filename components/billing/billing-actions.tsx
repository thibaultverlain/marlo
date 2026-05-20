"use client";

import { useState, useTransition } from "react";
import { ExternalLink, CreditCard } from "lucide-react";
import { createCheckoutSessionAction, createPortalSessionAction } from "@/lib/actions/billing";
import type { SubscriptionState } from "@/lib/db/queries/subscriptions";

export default function BillingActions({ state }: { state: SubscriptionState }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubscribe(plan: "mensuel" | "annuel") {
    setError(null);
    startTransition(async () => {
      const result = await createCheckoutSessionAction(plan);
      if (result.error) setError(result.error);
      else if (result.url) window.location.href = result.url;
    });
  }

  function handlePortal() {
    setError(null);
    startTransition(async () => {
      const result = await createPortalSessionAction();
      if (result.error) setError(result.error);
      else if (result.url) window.location.href = result.url;
    });
  }

  const showSubscribeCTA = ["trialing", "none", "canceled", "incomplete"].includes(state.status);
  const showPortalCTA = ["active", "past_due"].includes(state.status) || state.stripeCustomerId;

  return (
    <>
      {error && (
        <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {showSubscribeCTA && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="card-static p-5">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Mensuel</p>
            <p className="text-[32px] font-bold text-white tabular-nums mt-2">29€<span className="text-[14px] text-zinc-500 ml-1">/mois</span></p>
            <button
              onClick={() => handleSubscribe("mensuel")}
              disabled={isPending}
              className="mt-4 w-full px-4 py-2.5 text-[13px] font-semibold text-zinc-300 bg-[var(--color-bg-hover)] rounded-lg hover:bg-[var(--color-bg-hover)]/80 transition disabled:opacity-50"
            >
              {isPending ? "..." : "Choisir mensuel"}
            </button>
          </div>
          <div className="card-static p-5 border-rose-500/30" style={{ background: "linear-gradient(180deg, rgba(225,29,72,0.04), transparent)" }}>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Annuel</p>
              <span className="text-[10px] font-semibold text-rose-400 bg-rose-500/15 px-1.5 py-0.5 rounded">-17%</span>
            </div>
            <p className="text-[32px] font-bold text-white tabular-nums mt-2">24€<span className="text-[14px] text-zinc-500 ml-1">/mois</span></p>
            <p className="text-[11px] text-zinc-600">Facture 290€/an</p>
            <button
              onClick={() => handleSubscribe("annuel")}
              disabled={isPending}
              className="mt-4 w-full px-4 py-2.5 text-[13px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition disabled:opacity-50"
            >
              {isPending ? "..." : "Choisir annuel"}
            </button>
          </div>
        </div>
      )}

      {showPortalCTA && (
        <div className="card-static p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
              <CreditCard size={18} className="text-rose-400" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-white">Gerer mon abonnement</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">Carte bancaire, factures, annulation</p>
            </div>
            <button
              onClick={handlePortal}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-zinc-300 bg-[var(--color-bg-hover)] border border-[var(--color-border)] rounded-lg hover:text-white transition disabled:opacity-50"
            >
              <ExternalLink size={12} />
              {isPending ? "..." : "Ouvrir"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
