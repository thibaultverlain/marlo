import { getAuthContext } from "@/lib/auth/require-role";
import Link from "next/link";
import { FileText, FileSpreadsheet, Flame, Wallet, AlertCircle, CheckCircle2 } from "lucide-react";
import { getAllInvoices, getInvoiceStats } from "@/lib/db/queries/invoices";
import { getShopSettings } from "@/lib/db/queries/settings";
import { formatCurrency } from "@/lib/utils";
import InvoicesListClient from "@/components/invoices/invoices-list-client";

export const revalidate = 30;

export default async function InvoicesPage() {
  const { shopId } = await getAuthContext();
  const [invoices, stats, settings] = await Promise.all([
    getAllInvoices(shopId),
    getInvoiceStats(shopId),
    getShopSettings(shopId),
  ]);

  if (!settings) {
    return (
      <div className="space-y-6 page-enter">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Factures</h1>
        </div>
        <div className="bg-amber-500/[0.08] border border-amber-500/20 rounded-xl p-6">
          <h2 className="text-amber-300 font-semibold mb-2">Configuration requise</h2>
          <p className="text-sm text-amber-400/80 mb-4">
            Configure tes informations legales dans Reglages avant d'emettre des factures.
          </p>
          <Link href="/settings" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors">
            Configurer
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Factures</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {stats.total} facture{stats.total > 1 ? "s" : ""} · {formatCurrency(stats.totalAmount)} factures
          </p>
        </div>
        <a
          href="/api/invoices/excel"
          className="flex items-center gap-2 px-3 sm:px-4 py-2 text-[13px] font-medium text-zinc-400 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:text-zinc-200 transition-colors"
          title="Export Excel/CSV"
        >
          <FileSpreadsheet size={14} />
          <span className="hidden sm:inline">Excel</span>
        </a>
      </div>

      {/* KPIs */}
      {stats.total > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Total</p>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><FileText size={16} className="text-emerald-400" /></div>
            </div>
            <p className="text-[22px] font-bold text-white mt-auto">{stats.total}</p>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Total facture</p>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center"><Wallet size={16} className="text-rose-400" /></div>
            </div>
            <p className="text-[20px] font-bold text-white tabular-nums mt-auto">{formatCurrency(stats.totalAmount)}</p>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">A encaisser</p>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center"><AlertCircle size={16} className="text-amber-400" /></div>
            </div>
            <p className={`text-[20px] font-bold tabular-nums mt-auto ${stats.sent > 0 ? "text-amber-400" : "text-white"}`}>
              {formatCurrency(stats.sentAmount + stats.draftAmount)}
            </p>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Payees</p>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 size={16} className="text-emerald-400" /></div>
            </div>
            <p className="text-[20px] font-bold tabular-nums text-emerald-400 mt-auto">{formatCurrency(stats.paidAmount)}</p>
          </div>
        </div>
      )}

      {/* Bandeau impayes > 30j */}
      {stats.overdueCount > 0 && (
        <div className="flex items-center gap-3 bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <Flame size={16} className="text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-red-300">
              {stats.overdueCount} facture{stats.overdueCount > 1 ? "s" : ""} envoyee{stats.overdueCount > 1 ? "s" : ""} depuis plus de 30 jours sans paiement
            </p>
            <p className="text-[11px] text-red-400/70 mt-0.5">A relancer en priorite</p>
          </div>
        </div>
      )}

      {invoices.length === 0 ? (
        <div className="card-static p-12 text-center">
          <FileText size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm">Aucune facture. Va sur une vente avec client pour en creer une.</p>
        </div>
      ) : (
        <InvoicesListClient invoices={invoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerName: inv.customerName,
          status: inv.status,
          amountTtc: inv.amountTtc,
          createdAt: inv.createdAt,
        }))} />
      )}
    </div>
  );
}
