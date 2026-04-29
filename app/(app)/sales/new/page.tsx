import { getAuthContext } from "@/lib/auth/require-role";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getInStockProducts } from "@/lib/db/queries/products";
import { getAllCustomers } from "@/lib/db/queries/customers";
import NewSaleForm from "@/components/sales/new-sale-form";

export const dynamic = "force-dynamic";

export default async function NewSalePage({ searchParams }: { searchParams: Promise<{ productId?: string }> }) {
  const { shopId } = await getAuthContext();
  const [products, customers, sp] = await Promise.all([getInStockProducts(shopId), getAllCustomers(shopId), searchParams]);
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sales" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors"><ArrowLeft size={18} /></Link>
        <div><h1 className="text-2xl text-white">Nouvelle vente</h1><p className="text-sm text-zinc-500 mt-0.5">Enregistrer une vente</p></div>
      </div>
      {products.length === 0 ? (
        <div className="card-static p-10 text-center"><p className="text-zinc-500 mb-4 text-sm">Aucun article en stock.</p><Link href="/products/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors">Ajouter un article</Link></div>
      ) : (
        <NewSaleForm products={products.map((p) => ({ id: p.id, title: p.title, sku: p.sku, purchasePrice: Number(p.purchasePrice), targetPrice: p.targetPrice ? Number(p.targetPrice) : null }))} customers={customers.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}` }))} preselectedProductId={sp.productId} />
      )}
    </div>
  );
}
