import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, User, Wallet, Calendar, ShoppingCart } from "lucide-react";
import { getInvoiceWithSale } from "@/lib/db/queries/invoices";
import { formatCurrency, formatDate } from "@/lib/utils";
import InvoiceActions from "@/components/invoices/invoice-actions";

export const revalidate = 30;

const STATUS_MAP: Record<string, { label: string; cl: string }> = {
  brouillon: { label: "Brouillon", cl: "bg-zinc-500/15 text-zinc-400 border-zinc-500/20" },
  envoyee: { label: "Envoyee", cl: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  payee: { label: "Payee", cl: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20" },
  annulee: { label: "Annulee", cl: "bg-red-500/15 text-red-400 border-red-500/20" },
};

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getInvoiceWithSale(id);
  if (!data || !data.invoice) notFound();
  const { invoice, customer, sale } = data;
  const st = STATUS_MAP[invoice.status ?? "brouillon"];

  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/invoices" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] text-zinc-500">Emise le {formatDate(invoice.createdAt)}</p>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">Facture {invoice.invoiceNumber}</h1>
            <span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-medium border ${st.cl}`}>
              {st.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <InvoiceActions invoiceId={invoice.id} status={invoice.status ?? "brouillon"} />
          <a
            href={`/api/invoices/${invoice.id}/pdf?download=1`}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-[13px] font-medium text-zinc-300 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Telecharger</span>
          </a>
        </div>
      </div>

      {/* KPIs avec icones */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Client</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><User size={15} className="text-emerald-400" /></div>
          </div>
          {customer ? (
            <Link href={`/customers/${customer.id}`} className="mt-auto hover:text-rose-400 transition-colors">
              <p className="text-[16px] font-bold text-white truncate">{customer.firstName} {customer.lastName}</p>
              {customer.email && <p className="text-[11px] text-zinc-500 truncate mt-0.5">{customer.email}</p>}
            </Link>
          ) : (
            <p className="text-[16px] font-bold text-zinc-500 mt-auto">Sans client</p>
          )}
        </div>
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Montant TTC</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Wallet size={15} className="text-emerald-400" /></div>
          </div>
          <div className="mt-auto">
            <p className="text-[22px] font-bold text-white tabular-nums">{formatCurrency(invoice.amountTtc)}</p>
            {invoice.vatMention && <p className="text-[10px] text-zinc-500 mt-0.5">{invoice.vatMention}</p>}
          </div>
        </div>
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{invoice.paidAt ? "Payee le" : "Date d'emission"}</p>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${invoice.paidAt ? "bg-emerald-500/10" : "bg-zinc-500/10"}`}>
              <Calendar size={15} className={invoice.paidAt ? "text-emerald-400" : "text-zinc-400"} />
            </div>
          </div>
          <p className={`text-[16px] font-bold mt-auto ${invoice.paidAt ? "text-emerald-400" : "text-white"}`}>
            {formatDate(invoice.paidAt ?? invoice.createdAt)}
          </p>
        </div>
      </div>

      {/* Vente associee */}
      {sale && (
        <Link href={`/sales/${sale.id}`} className="block card-static p-4 hover:border-[var(--color-border-hover)] transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
              <ShoppingCart size={18} className="text-rose-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] text-zinc-500">Vente associee</p>
              <p className="text-[13px] font-medium text-white mt-0.5">{formatCurrency(sale.salePrice)} · {formatDate(sale.soldAt)}</p>
            </div>
            <ExternalLink size={14} className="text-zinc-500 group-hover:text-rose-400 transition-colors" />
          </div>
        </Link>
      )}

      {/* PDF preview */}
      <div className="card-static overflow-hidden">
        <div className="px-6 py-3 border-b border-[var(--color-border)] flex items-center justify-between">
          <p className="text-sm font-medium text-zinc-300">Apercu</p>
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 font-medium"
          >
            <ExternalLink size={11} />
            Ouvrir en grand
          </a>
        </div>
        <iframe src={`/api/invoices/${invoice.id}/pdf`} className="w-full h-[500px] lg:h-[900px] border-0 bg-white" title="Apercu facture" />
      </div>

      <div className="pb-8" />
    </div>
  );
}
