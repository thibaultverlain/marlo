import { getAuthContext, canAccess } from "@/lib/auth/require-role";
import { getShopTemplates } from "@/lib/db/queries/templates";
import TemplatesPageClient from "@/components/templates/templates-page-client";
export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const ctx = await getAuthContext();
  if (!canAccess(ctx, "templates")) {
    return (
      <div className="space-y-6 page-enter">
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Templates</h1>
        <div className="card-static p-12 text-center">
          <p className="text-zinc-500 text-sm">Vous n'avez pas acces a cette section.</p>
        </div>
      </div>
    );
  }

  const templates = await getShopTemplates(ctx.shopId);

  return (
    <div className="max-w-4xl mx-auto space-y-6 page-enter">
      <TemplatesPageClient templates={templates} isOwner={ctx.role === "owner"} />
    </div>
  );
}
