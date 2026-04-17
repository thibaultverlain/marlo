import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, User, Package, FileText, Truck, Eye } from "lucide-react";
import { getSaleById } from "@/lib/db/queries/sales";
import { getCustomerById } from "@/lib/db/queries/customers";
import { getProductById } from "@/lib/db/queries/products";
import { db } from "@/lib/db/client";
import { invoices } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { formatCurrency, formatPercent, formatDate } from "@/lib/utils";
import { CHANNELS } from "@/lib/data";
import SaleActions from "@/components/sales/sale-actions";

export const dynamic = "force-dynamic";

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sale = await getSaleById(id);
  if (!sale) notFound();

  const [customer, product, existingInvoice] = await Promise.all([
    sale.customerId ? getCustomerById(sale.customerId) : null,
    sale.productId ? getProductById(sale.productId) : null,
    db.select().from(invoices).where(eq(invoices.relatedSaleId, sale.id)).limit(1),
  ]);

  const invoice = existingInvoice[0];
  const channelLabel = CHANNELS.find((c) => c.value === sale.channel)?.label ?? sale.channel;

  const paymentLabels: Record<string, string> = {
    en_attente: "En attente",
    recu: "Reçu",
    rembourse: "Remboursé",
  };

  const shippingLabels: Record<string, string> = {
    a_expedier: "À expédier",
    expedie: "Expédié",
    livre: "Livré",
    retourne: "Retourné",
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sales" className="w-9 h-9 flex items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:text-stone-600 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <p className="text-xs text-stone-400">Vente du {formatDate(sale.soldAt)}</p>
          <h1 className="text-2xl text-stone-900">{product?.title ?? "Article supprimé"}</h1>
        </div>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-stone-200/60 p-5">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Prix de vente</p>
          <p className="text-2xl font-semibold text-stone-900">{formatCurrency(sale.salePrice)}</p>
          <p className="text-[11px] text-stone-400 mt-0.5">sur {channelLabel}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200/60 p-5">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Revenu net</p>
          <p className="text-2xl font-semibold text-stone-900">{formatCurrency(sale.netRevenue)}</p>
          <p className="text-[11px] text-stone-400 mt-0.5">
            Après {formatCurrency(sale.platformFees)} de frais
          </p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200/60 p-5">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Marge nette</p>
          <p className={`text-2xl font-semibold ${Number(sale.margin) >= 0 ? "text-green-700" : "text-red-600"}`}>
            {formatCurrency(sale.margin)}
          </p>
          <p className={`text-[11px] mt-0.5 ${Number(sale.marginPct) >= 0 ? "text-green-600" : "text-red-500"}`}>
            {formatPercent(Number(sale.marginPct))}
          </p>
        </div>
      </div>

      {/* Product */}
      {product && (
        <div className="bg-white rounded-xl border border-stone-200/60 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package size={16} className="text-stone-400" />
            <h2 className="text-lg text-stone-900">Article vendu</h2>
          </div>
          <Link
            href={`/products/${product.id}`}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-stone-50 transition-colors -m-3"
          >
            <div className="w-14 h-14 rounded-lg bg-stone-100 flex items-center justify-center flex-shrink-0">
              <Package size={20} className="text-stone-300" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-stone-800">{product.title}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-stone-400">{product.sku}</span>
                <span className="text-stone-200">·</span>
                <span className="text-xs text-stone-400">{product.brand}</span>
                <span className="text-stone-200">·</span>
                <span className="text-xs text-stone-400">Achat : {formatCurrency(product.purchasePrice)}</span>
              </div>
            </div>
          </Link>
        </div>
      )}

      {/* Customer */}
      <div className="bg-white rounded-xl border border-stone-200/60 p-6">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-stone-400" />
          <h2 className="text-lg text-stone-900">Client</h2>
        </div>
        {customer ? (
          <Link
            href={`/customers/${customer.id}`}
            className="flex items-center gap-4 p-3 rounded-lg hover:bg-stone-50 transition-colors -m-3"
          >
            <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-sm font-semibold text-stone-500">
              {customer.firstName[0]}{customer.lastName[0]}
            </div>
            <div>
              <p className="text-sm font-medium text-stone-800">
                {customer.firstName} {customer.lastName}
              </p>
              {customer.email && <p className="text-xs text-stone-400 mt-0.5">{customer.email}</p>}
            </div>
          </Link>
        ) : (
          <p className="text-sm text-stone-400">
            Aucun client associé à cette vente. Pour émettre une facture, associe un client.
          </p>
        )}
      </div>

      {/* Status row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-stone-200/60 p-5">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Paiement</p>
          <p className="text-sm font-semibold text-stone-800">
            {paymentLabels[sale.paymentStatus ?? "en_attente"]}
          </p>
          {sale.paymentMethod && (
            <p className="text-[11px] text-stone-400 mt-0.5">via {sale.paymentMethod}</p>
          )}
        </div>
        {sale.shippingStatus && (
          <div className="bg-white rounded-xl border border-stone-200/60 p-5">
            <div className="flex items-center gap-1.5 mb-1">
              <Truck size={12} className="text-stone-400" />
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Livraison</p>
            </div>
            <p className="text-sm font-semibold text-stone-800">
              {shippingLabels[sale.shippingStatus] ?? sale.shippingStatus}
            </p>
            {sale.trackingNumber && (
              <p className="text-[11px] text-stone-400 mt-0.5 font-mono">{sale.trackingNumber}</p>
            )}
          </div>
        )}
      </div>

      {/* Invoice section */}
      <div className="bg-white rounded-xl border border-stone-200/60 p-6">
        <div className="flex items-center gap-2 mb-4">
          <FileText size={16} className="text-stone-400" />
          <h2 className="text-lg text-stone-900">Facture</h2>
        </div>

        {invoice ? (
          <div className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-stone-800">{invoice.invoiceNumber}</p>
              <p className="text-xs text-stone-400 mt-0.5">
                Émise le {formatDate(invoice.createdAt)} · {formatCurrency(invoice.amountTtc)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/invoices/${invoice.id}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
              >
                <Eye size={14} />
                Voir
              </Link>
            </div>
          </div>
        ) : customer ? (
          <>
            <p className="text-sm text-stone-500 mb-4">
              Aucune facture générée pour cette vente.
            </p>
            <SaleActions saleId={sale.id} />
          </>
        ) : (
          <p className="text-sm text-stone-400">
            Ajoute un client à cette vente pour pouvoir émettre une facture.
          </p>
        )}
      </div>

      {sale.notes && (
        <div className="bg-white rounded-xl border border-stone-200/60 p-6">
          <h2 className="text-lg text-stone-900 mb-3">Notes</h2>
          <p className="text-sm text-stone-600 whitespace-pre-line">{sale.notes}</p>
        </div>
      )}

      <div className="pb-8" />
    </div>
  );
}
