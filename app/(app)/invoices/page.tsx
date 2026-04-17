import Link from "next/link";
import { FileText, Download } from "lucide-react";
import { getAllInvoices, getInvoiceStats } from "@/lib/db/queries/invoices";
import { getShopSettings } from "@/lib/db/queries/settings";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  brouillon: { label: "Brouillon", className: "bg-stone-100 text-stone-600" },
  envoyee: { label: "Envoyée", className: "bg-blue-50 text-blue-700" },
  payee: { label: "Payée", className: "bg-green-50 text-green-700" },
  annulee: { label: "Annulée", className: "bg-red-50 text-red-600" },
};

export default async function InvoicesPage() {
  const [invoices, stats, settings] = await Promise.all([
    getAllInvoices(),
    getInvoiceStats(),
    getShopSettings(),
  ]);

  // Warn if settings are missing
  if (!settings) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl text-stone-900">Factures</h1>
          <p className="text-stone-400 mt-1">Facturation conforme</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
          <h2 className="text-amber-800 font-semibold mb-2">Configuration requise</h2>
          <p className="text-sm text-amber-700 mb-4">
            Avant de pouvoir émettre des factures, tu dois configurer tes informations légales
            (raison sociale, SIRET, adresse, régime TVA...) dans les Réglages.
          </p>
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors"
          >
            Configurer maintenant
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-stone-900">Factures</h1>
          <p className="text-stone-400 mt-1">
            {stats.total} facture{stats.total > 1 ? "s" : ""} · {formatCurrency(stats.totalAmount)} facturés
          </p>
        </div>
      </div>

      {stats.total > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-stone-200/60 p-4">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-semibold text-stone-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200/60 p-4">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Brouillons</p>
            <p className="text-2xl font-semibold text-stone-900 mt-1">{stats.draft}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200/60 p-4">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Envoyées</p>
            <p className="text-2xl font-semibold text-blue-700 mt-1">{stats.sent}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200/60 p-4">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Payées</p>
            <p className="text-2xl font-semibold text-green-700 mt-1">{stats.paid}</p>
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200/60 p-12 text-center">
          <FileText size={40} className="mx-auto text-stone-300 mb-3" />
          <p className="text-stone-500 mb-2">Aucune facture émise</p>
          <p className="text-xs text-stone-400">
            Pour créer une facture, va sur une vente avec un client associé et clique sur "Générer la facture".
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200/60 overflow-hidden">
          <div className="divide-y divide-stone-100">
            {invoices.map((inv) => {
              const status = STATUS_LABELS[inv.status ?? "brouillon"];
              return (
                <div key={inv.id} className="flex items-center justify-between px-6 py-4 hover:bg-stone-50/50 transition-colors">
                  <Link href={`/invoices/${inv.id}`} className="flex-1 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-stone-50 flex items-center justify-center">
                      <FileText size={18} className="text-stone-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-800">{inv.invoiceNumber}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-stone-400">{inv.customerName ?? "Sans client"}</span>
                        <span className="text-stone-300">·</span>
                        <span className="text-xs text-stone-400">{formatDate(inv.createdAt)}</span>
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center gap-4">
                    <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium ${status.className}`}>
                      {status.label}
                    </span>
                    <p className="text-sm font-semibold text-stone-900 w-24 text-right">
                      {formatCurrency(inv.amountTtc)}
                    </p>
                    <a
                      href={`/api/invoices/${inv.id}/pdf?download=1`}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
                      title="Télécharger la facture"
                    >
                      <Download size={14} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
