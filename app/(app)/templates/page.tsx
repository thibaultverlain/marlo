import { getAuthContext, canAccess } from "@/lib/auth/require-role";
import { getShopTemplates } from "@/lib/db/queries/templates";
import { getInStockProducts } from "@/lib/db/queries/products";
import TemplatesPageClient from "@/components/templates/templates-page-client";

export const revalidate = 30;

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

  const [templates, products] = await Promise.all([
    getShopTemplates(ctx.shopId),
    getInStockProducts(ctx.shopId),
  ]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      <TemplatesPageClient
        templates={templates}
        isOwner={ctx.role === "owner"}
        products={products.map((p) => ({
          id: p.id,
          sku: p.sku,
          title: p.title,
          brand: p.brand,
          color: p.color,
          size: p.size,
          condition: p.condition,
          targetPrice: p.targetPrice,
        }))}
      />
    </div>
  );
}
