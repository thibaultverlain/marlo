import { getAuthContext } from "@/lib/auth/require-role";
import { getShopAutomations } from "@/lib/db/queries/automations";
import AutomationsPageClient from "@/components/automations/automations-page-client";
export const dynamic = "force-dynamic";

export default async function AutomationsPage() {
  const ctx = await getAuthContext();

  if (ctx.role !== "owner") {
    return (
      <div className="space-y-6 page-enter">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Automatisations</h1>
        <div className="card-static p-12 text-center">
          <p className="text-zinc-500 text-sm">Acces reserve au proprietaire de la boutique.</p>
        </div>
      </div>
    );
  }

  const automations = await getShopAutomations(ctx.shopId);

  return (
    <div className="max-w-4xl mx-auto space-y-6 page-enter">
      <AutomationsPageClient automations={automations} />
    </div>
  );
}
