import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Package, AlertTriangle, Edit2 } from "lucide-react";
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
  const expectedMargin = targetPrice && purchasePrice > 0
    ? ((targetPrice - purchasePrice) / purchasePrice) * 100
    : 0;

  const days = daysSince(product.createdAt);
  const isDormant = !["vendu", "livre", "retourne"].includes(product.status) && days > 30;

  const status = PRODUCT_STATUSES.find(s => s.value === product.status);
  const category = CATEGORIES.find(c => c.value === product.category);
  const condition = CONDITIONS.find(c => c.value === product.condition);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/products" className="w-9 h-9 flex items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:text-stone-600 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <p className="text-xs text-stone-400">{product.sku}</p>
          <h1 className="text-2xl text-stone-900">{product.title}</h1>
        </div>
        {status && (
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white ${status.color}`}>
            {status.label}
          </span>
        )}
      </div>

      {isDormant && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          <AlertTriangle size={16} />
          <span>Cet article est en stock depuis {days} jours. Envisage une baisse de prix ou une relist.</span>
        </div>
      )}

      <ProductPhotos productId={product.id} images={product.images ?? []} />

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-stone-200/60 p-5">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Prix d'achat</p>
          <p className="text-2xl font-semibold text-stone-900" style={{ fontFamily: "DM Sans" }}>
            {formatCurrency(purchasePrice)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200/60 p-5">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Prix de vente visé</p>
          <div className="flex items-end gap-2">
            <p className="text-2xl font-semibold text-stone-900" style={{ fontFamily: "DM Sans" }}>
              {formatCurrency(targetPrice)}
            </p>
            {expectedMargin > 0 && (
              <span className="text-sm font-medium text-green-600 mb-1">{formatPercent(expectedMargin)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-stone-200/60 p-6 space-y-4">
        <h2 className="text-lg text-stone-900">Caractéristiques</h2>
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
        <div className="bg-white rounded-xl border border-stone-200/60 p-6">
          <h2 className="text-lg text-stone-900 mb-4">En vente sur</h2>
          <div className="flex gap-2 flex-wrap">
            {product.listedOn.map((ch) => {
              const channel = CHANNELS.find((c) => c.value === ch);
              return (
                <span key={ch} className="px-3 py-1.5 bg-stone-100 rounded-lg text-sm text-stone-700">
                  {channel?.label ?? ch}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {product.notes && (
        <div className="bg-white rounded-xl border border-stone-200/60 p-6">
          <h2 className="text-lg text-stone-900 mb-3">Notes</h2>
          <p className="text-sm text-stone-600 whitespace-pre-line">{product.notes}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200/60 p-6">
        <h2 className="text-lg text-stone-900 mb-4">Traçabilité</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-500">Ajouté le</span>
            <span className="text-stone-800">{formatDate(product.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Dernière modification</span>
            <span className="text-stone-800">{formatDate(product.updatedAt)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Jours en stock</span>
            <span className="text-stone-800">{days} jours</span>
          </div>
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
      <dt className="text-xs font-medium text-stone-400 uppercase tracking-wider">{label}</dt>
      <dd className="text-stone-800 mt-0.5">{value}</dd>
    </div>
  );
}
