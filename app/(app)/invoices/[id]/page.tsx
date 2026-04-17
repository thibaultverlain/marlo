import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, CheckCircle2, Send } from "lucide-react";
import { getInvoiceWithSale } from "@/lib/db/queries/invoices";
import { formatCurrency, formatDate } from "@/lib/utils";
import InvoiceActions from "@/components/invoices/invoice-actions";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  brouillon: { label: "Brouillon", className: "bg-stone-100 text-stone-600" },
  envoyee: { label: "Envoyée", className: "bg-blue-50 text-blue-700" },
  payee: { label: "Payée", className: "bg-green-50 text-green-700" },
  annulee: { label: "Annulée", className: "bg-red-50 text-red-600" },
};

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getInvoiceWithSale(id);
  if (!data || !data.invoice) notFound();

  const { invoice, customer, sale } = data;
  const status = STATUS_LABELS[invoice.status ?? "brouillon"];

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/invoices" className="w-9 h-9 flex items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:text-stone-600 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <p className="text-xs text-stone-400">{formatDate(invoice.createdAt)}</p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl text-stone-900">Facture {invoice.invoiceNumber}</h1>
            <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium ${status.className}`}>
              {status.label}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={`/api/invoices/${invoice.id}/pdf?download=1`}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors"
          >
            <Download size={16} />
            Télécharger
          </a>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-stone-200/60 p-5">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Client</p>
          <p className="text-lg font-semibold text-stone-900">
            {customer ? `${customer.firstName} ${customer.lastName}` : "Sans client"}
          </p>
          {customer?.email && <p className="text-xs text-stone-400 mt-0.5">{customer.email}</p>}
        </div>
        <div className="bg-white rounded-xl border border-stone-200/60 p-5">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Montant TTC</p>
          <p className="text-2xl font-semibold text-stone-900">{formatCurrency(invoice.amountTtc)}</p>
          {invoice.vatMention && (
            <p className="text-[11px] text-stone-400 mt-1">{invoice.vatMention}</p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-stone-200/60 p-5">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">État</p>
          <p className="text-lg font-semibold text-stone-900">{status.label}</p>
          {invoice.sentAt && (
            <p className="text-xs text-stone-400 mt-0.5">Envoyée le {formatDate(invoice.sentAt)}</p>
          )}
          {invoice.paidAt && (
            <p className="text-xs text-stone-400 mt-0.5">Payée le {formatDate(invoice.paidAt)}</p>
          )}
        </div>
      </div>

      {/* PDF preview */}
      <div className="bg-white rounded-xl border border-stone-200/60 overflow-hidden">
        <div className="px-6 py-3 border-b border-stone-100 flex items-center justify-between">
          <p className="text-sm font-medium text-stone-700">Aperçu</p>
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-amber-700 hover:text-amber-800 font-medium"
          >
            Ouvrir en grand
          </a>
        </div>
        <iframe
          src={`/api/invoices/${invoice.id}/pdf`}
          className="w-full h-[900px] border-0"
          title="Aperçu facture"
        />
      </div>

      <InvoiceActions invoiceId={invoice.id} status={invoice.status ?? "brouillon"} />

      <div className="pb-8" />
    </div>
  );
}
