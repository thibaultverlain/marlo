import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { getInvoiceWithSale } from "@/lib/db/queries/invoices";
import { formatCurrency, formatDate } from "@/lib/utils";
import InvoiceActions from "@/components/invoices/invoice-actions";
export const dynamic = "force-dynamic";
const SL: Record<string, { label: string; cl: string }> = { brouillon: { label: "Brouillon", cl: "bg-zinc-500/15 text-zinc-400" }, envoyee: { label: "Envoyée", cl: "bg-blue-500/15 text-blue-400" }, payee: { label: "Payée", cl: "bg-emerald-500/15 text-emerald-400" }, annulee: { label: "Annulée", cl: "bg-red-500/15 text-red-400" } };

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getInvoiceWithSale(id);
  if (!data || !data.invoice) notFound();
  const { invoice, customer } = data;
  const st = SL[invoice.status ?? "brouillon"];
  return (
    <div className="max-w-5xl mx-auto space-y-6 page-enter">
      <div className="flex items-center gap-4">
        <Link href="/invoices" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors"><ArrowLeft size={18} /></Link>
        <div className="flex-1"><p className="text-[11px] text-zinc-600">{formatDate(invoice.createdAt)}</p><div className="flex items-center gap-3"><h1 className="text-2xl font-bold text-white tracking-tight">Facture {invoice.invoiceNumber}</h1><span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-medium ${st.cl}`}>{st.label}</span></div></div>
        <a href={`/api/invoices/${invoice.id}/pdf?download=1`} className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-zinc-300 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg row-hover transition-colors"><Download size={14} />Télécharger</a>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="kpi-card p-5 flex flex-col justify-between min-h-[110px]"><p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Client</p><p className="text-[18px] font-bold text-white mt-auto">{customer ? `${customer.firstName} ${customer.lastName}` : "Sans client"}</p></div>
        <div className="kpi-card p-5 flex flex-col justify-between min-h-[110px]"><p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Montant TTC</p><p className="text-[24px] font-bold text-white tabular-nums mt-auto">{formatCurrency(invoice.amountTtc)}</p>{invoice.vatMention && <p className="text-[10px] text-zinc-600 mt-1">{invoice.vatMention}</p>}</div>
        <div className="kpi-card p-5 flex flex-col justify-between min-h-[110px]"><p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Etat</p><p className="text-[18px] font-bold text-white mt-auto">{st.label}</p>{invoice.paidAt && <p className="text-[11px] text-zinc-600 mt-0.5">Payee le {formatDate(invoice.paidAt)}</p>}</div>
      </div>
      <div className="card-static overflow-hidden">
        <div className="px-6 py-3 border-b border-[var(--color-border)] flex items-center justify-between"><p className="text-sm font-medium text-zinc-300">Aperçu</p><a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer" className="text-xs text-rose-400 hover:text-rose-300 font-medium">Ouvrir en grand</a></div>
        <iframe src={`/api/invoices/${invoice.id}/pdf`} className="w-full h-[500px] lg:h-[900px] border-0 bg-white" title="Aperçu facture" />
      </div>
      <InvoiceActions invoiceId={invoice.id} status={invoice.status ?? "brouillon"} />
      <div className="pb-8" />
    </div>
  );
}
