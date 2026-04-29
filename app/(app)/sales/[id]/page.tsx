import Link from "next/link";
import { notFound } from "next/navigation";
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
import SaleDeleteButton from "@/components/sales/sale-delete-button";

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

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sales" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors"><ArrowLeft size={18} /></Link>
        <div className="flex-1"><p className="text-[11px] text-zinc-600">Vente du {formatDate(sale.soldAt)}</p><h1 className="text-2xl text-white">{product?.title ?? "Article supprimé"}</h1></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <div className="card-static p-5"><p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Prix de vente</p><p className="text-2xl font-semibold text-white tabular-nums">{formatCurrency(sale.salePrice)}</p><p className="text-[11px] text-zinc-600 mt-0.5">sur {channelLabel}</p></div>
        <div className="card-static p-5"><p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Revenu net</p><p className="text-2xl font-semibold text-white tabular-nums">{formatCurrency(sale.netRevenue)}</p><p className="text-[11px] text-zinc-600 mt-0.5">Après {formatCurrency(sale.platformFees)} de frais</p></div>
        <div className="card-static p-5"><p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Marge nette</p><p className={`text-2xl font-semibold tabular-nums ${Number(sale.margin) >= 0 ? "text-emerald-400" : "text-red-400"}`}>{formatCurrency(sale.margin)}</p><p className={`text-[11px] mt-0.5 ${Number(sale.marginPct) >= 0 ? "text-emerald-500" : "text-red-500"}`}>{formatPercent(Number(sale.marginPct))}</p></div>
      </div>

      {product && (
        <div className="card-static p-6">
          <div className="flex items-center gap-2 mb-4"><Package size={16} className="text-zinc-500" /><h2 className="text-[15px] font-semibold text-white">Article vendu</h2></div>
          <Link href={`/products/${product.id}`} className="flex items-center gap-4 p-3 rounded-lg row-hover transition-colors -m-3">
            <div className="w-14 h-14 rounded-lg bg-zinc-800 flex items-center justify-center flex-shrink-0"><Package size={20} className="text-zinc-600" /></div>
            <div className="flex-1"><p className="text-sm text-zinc-200">{product.title}</p><div className="flex items-center gap-2 mt-0.5"><span className="text-[11px] text-zinc-600 font-mono">{product.sku}</span><span className="text-zinc-700">·</span><span className="text-[11px] text-zinc-500">{product.brand}</span><span className="text-zinc-700">·</span><span className="text-[11px] text-zinc-500">Achat : {formatCurrency(product.purchasePrice)}</span></div></div>
          </Link>
        </div>
      )}

      <div className="card-static p-6">
        <div className="flex items-center gap-2 mb-4"><User size={16} className="text-zinc-500" /><h2 className="text-[15px] font-semibold text-white">Client</h2></div>
        {customer ? (
          <Link href={`/customers/${customer.id}`} className="flex items-center gap-4 p-3 rounded-lg row-hover transition-colors -m-3">
            <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-semibold text-zinc-400">{customer.firstName[0]}{customer.lastName[0]}</div>
            <div><p className="text-sm text-zinc-200">{customer.firstName} {customer.lastName}</p>{customer.email && <p className="text-[11px] text-zinc-500 mt-0.5">{customer.email}</p>}</div>
          </Link>
        ) : <p className="text-sm text-zinc-500">Aucun client associé.</p>}
      </div>

      <div className="card-static p-6">
        <div className="flex items-center gap-2 mb-4"><FileText size={16} className="text-zinc-500" /><h2 className="text-[15px] font-semibold text-white">Facture</h2></div>
        {invoice ? (
          <div className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
            <div><p className="text-sm text-zinc-200">{invoice.invoiceNumber}</p><p className="text-[11px] text-zinc-500 mt-0.5">Émise le {formatDate(invoice.createdAt)} · {formatCurrency(invoice.amountTtc)}</p></div>
            <Link href={`/invoices/${invoice.id}`} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-cyan-400 hover:bg-cyan-400/10 rounded-lg transition-colors"><Eye size={14} />Voir</Link>
          </div>
        ) : customer ? <><p className="text-sm text-zinc-500 mb-4">Aucune facture.</p><SaleActions saleId={sale.id} /></> : <p className="text-sm text-zinc-600">Ajoute un client pour facturer.</p>}
      </div>

      {sale.notes && <div className="card-static p-6"><h2 className="text-[15px] font-semibold text-white mb-3">Notes</h2><p className="text-sm text-zinc-400 whitespace-pre-line">{sale.notes}</p></div>}

      <SaleDeleteButton saleId={sale.id} />
      <div className="pb-8" />
    </div>
  );
}
