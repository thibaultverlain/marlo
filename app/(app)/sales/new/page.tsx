import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getInStockProducts } from "@/lib/db/queries/products";
import { getAllCustomers } from "@/lib/db/queries/customers";
import NewSaleForm from "@/components/sales/new-sale-form";

export const dynamic = "force-dynamic";

export default async function NewSalePage({ searchParams }: { searchParams: Promise<{ productId?: string }> }) {
  const [products, customers, sp] = await Promise.all([
    getInStockProducts(),
    getAllCustomers(),
    searchParams,
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sales" className="w-9 h-9 flex items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:text-stone-600 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-2xl text-stone-900">Nouvelle vente</h1>
          <p className="text-sm text-stone-400 mt-0.5">Enregistrer une vente</p>
        </div>
      </div>

      {products.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200/60 p-10 text-center">
          <p className="text-stone-500 mb-4">Aucun article en stock à vendre.</p>
          <Link
            href="/products/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors"
          >
            Ajouter un article d'abord
          </Link>
        </div>
      ) : (
        <NewSaleForm
          products={products.map((p) => ({
            id: p.id,
            title: p.title,
            sku: p.sku,
            purchasePrice: Number(p.purchasePrice),
            targetPrice: p.targetPrice ? Number(p.targetPrice) : null,
          }))}
          customers={customers.map((c) => ({
            id: c.id,
            name: `${c.firstName} ${c.lastName}`,
          }))}
          preselectedProductId={sp.productId}
        />
      )}
    </div>
  );
}
