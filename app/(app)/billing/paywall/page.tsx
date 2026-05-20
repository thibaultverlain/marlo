import { redirect } from "next/navigation";
import { Lock, Sparkles } from "lucide-react";
import { getAuthContext } from "@/lib/auth/require-role";
import { getSubscriptionState } from "@/lib/db/queries/subscriptions";
import BillingActions from "@/components/billing/billing-actions";

export const dynamic = "force-dynamic";

export default async function PaywallPage() {
  const { shopId } = await getAuthContext();
  const state = await getSubscriptionState(shopId);

  // If has access, redirect to dashboard
  if (state.hasAccess) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-rose-500/10 mb-4">
            <Lock size={24} className="text-rose-400" />
          </div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">
            {state.status === "trialing" ? "Ton essai est termine" :
             state.status === "past_due" ? "Probleme de paiement" :
             state.status === "canceled" ? "Abonnement annule" :
             "Abonnement requis"}
          </h1>
          <p className="text-zinc-400 mt-3">
            {state.status === "past_due"
              ? "Le dernier paiement a echoue. Mets a jour ta carte bancaire pour retrouver l'acces."
              : "Pour continuer a utiliser Marlo, choisis ton plan."}
          </p>
        </div>

        <BillingActions state={state} />

        <div className="text-center pt-4">
          <p className="text-[12px] text-zinc-600 flex items-center justify-center gap-1.5">
            <Sparkles size={11} className="text-rose-400" />
            Toutes tes donnees sont conservees. Tu reprendras la ou tu en etais.
          </p>
        </div>
      </div>
    </div>
  );
}
