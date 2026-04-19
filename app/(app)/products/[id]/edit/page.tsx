import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getProductById } from "@/lib/db/queries/products";
import EditProductForm from "@/components/products/edit-product-form";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/products/${id}`} className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <p className="text-[11px] text-zinc-600 font-mono">{product.sku}</p>
          <h1 className="text-2xl text-white">Modifier l'article</h1>
        </div>
      </div>
      <EditProductForm product={{
        id: product.id,
        title: product.title,
        brand: product.brand,
        model: product.model ?? "",
        category: product.category,
        size: product.size ?? "",
        color: product.color ?? "",
        condition: product.condition,
        purchasePrice: String(product.purchasePrice),
        targetPrice: product.targetPrice ? String(product.targetPrice) : "",
        purchaseSource: product.purchaseSource ?? "",
        purchaseDate: product.purchaseDate ?? "",
        listedOn: product.listedOn ?? [],
        serialNumber: product.serialNumber ?? "",
        notes: product.notes ?? "",
        status: product.status,
      }} />
    </div>
  );
}
