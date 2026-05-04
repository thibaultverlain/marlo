import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package, AlertTriangle } from "lucide-react";
import { getProductById } from "@/lib/db/queries/products";
import { formatCurrency, formatPercent, formatDate, daysSince } from "@/lib/utils";
import { PRODUCT_STATUSES, CHANNELS, CATEGORIES, CONDITIONS } from "@/lib/data";
import ProductActions from "@/components/products/product-actions";
import ProductPhotos from "@/components/products/product-photos";

export const dynamic = "force-dynamic";

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  const purchasePrice = Number(product.purchasePrice);
  const targetPrice = product.targetPrice ? Number(product.targetPrice) : null;
  const expectedMargin = targetPrice && purchasePrice > 0 ? ((targetPrice - purchasePrice) / purchasePrice) * 100 : 0;
  const days = daysSince(product.createdAt);
  const isDormant = !["vendu", "livre", "retourne"].includes(product.status) && days > 30;
  const status = PRODUCT_STATUSES.find(s => s.value === product.status);
  const category = CATEGORIES.find(c => c.value === product.category);
  const condition = CONDITIONS.find(c => c.value === product.condition);

  return (
    <div className="max-w-3xl space-y-6 page-enter">
      <div className="flex items-center gap-4">
        <Link href="/products" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <p className="text-[11px] text-zinc-600 font-mono">{product.sku}</p>
          <h1 className="text-2xl font-bold text-white tracking-tight">{product.title}</h1>
        </div>
        {status && (
          <span className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-[var(--color-bg-hover)] text-zinc-300">
            {status.label}
          </span>
        )}
      </div>

      {isDormant && (
        <div className="flex items-center gap-2 p-3 bg-amber-500/[0.08] border border-amber-500/20 rounded-lg text-sm text-amber-400">
          <AlertTriangle size={15} />
          <span>En stock depuis {days} jours. Envisage une baisse de prix ou une relist.</span>
        </div>
      )}

      <ProductPhotos productId={product.id} images={product.images ?? []} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="card-static p-5">
          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Prix d'achat</p>
          <p className="text-2xl font-semibold text-white tabular-nums">{formatCurrency(purchasePrice)}</p>
        </div>
        <div className="card-static p-5">
          <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Prix de vente visé</p>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-semibold text-white tabular-nums">{formatCurrency(targetPrice)}</p>
            {expectedMargin > 0 && <span className="text-sm font-medium text-emerald-400 mb-1">{formatPercent(expectedMargin)}</span>}
          </div>
        </div>
      </div>

      <div className="card-static p-6 space-y-4">
        <h2 className="text-[15px] font-semibold text-white">Caractéristiques</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          <Row label="Marque" value={product.brand} />
          <Row label="Modèle" value={product.model} />
          <Row label="Catégorie" value={category?.label} />
          <Row label="Taille" value={product.size} />
          <Row label="Couleur" value={product.color} />
          <Row label="État" value={condition?.label} />
          <Row label="Source d'achat" value={product.purchaseSource} />
          <Row label="Date d'achat" value={product.purchaseDate ? formatDate(product.purchaseDate) : null} />
          {product.serialNumber && <Row label="N° de série" value={product.serialNumber} />}
        </div>
      </div>

      {product.listedOn && product.listedOn.length > 0 && (
        <div className="card-static p-6">
          <h2 className="text-[15px] font-semibold text-white mb-4">En vente sur</h2>
          <div className="flex gap-2 flex-wrap">
            {product.listedOn.map((ch) => {
              const channel = CHANNELS.find((c) => c.value === ch);
              return <span key={ch} className="px-3 py-1.5 bg-[var(--color-bg-hover)] rounded-lg text-sm text-zinc-300">{channel?.label ?? ch}</span>;
            })}
          </div>
        </div>
      )}

      {product.notes && (
        <div className="card-static p-6">
          <h2 className="text-[15px] font-semibold text-white mb-3">Notes</h2>
          <p className="text-sm text-zinc-400 whitespace-pre-line">{product.notes}</p>
        </div>
      )}

      <div className="card-static p-6">
        <h2 className="text-[15px] font-semibold text-white mb-4">Traçabilité</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-zinc-500">Ajouté le</span><span className="text-zinc-300">{formatDate(product.createdAt)}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Dernière modification</span><span className="text-zinc-300">{formatDate(product.updatedAt)}</span></div>
          <div className="flex justify-between"><span className="text-zinc-500">Jours en stock</span><span className="text-zinc-300">{days} jours</span></div>
        </div>
      </div>

      <ProductActions productId={product.id} status={product.status} />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">{label}</dt>
      <dd className="text-zinc-300 mt-0.5">{value}</dd>
    </div>
  );
}
