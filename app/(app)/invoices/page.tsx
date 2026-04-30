import { getAuthContext } from "@/lib/auth/require-role";
import Link from "next/link";
import { FileText, Download } from "lucide-react";
import { getAllInvoices, getInvoiceStats } from "@/lib/db/queries/invoices";
import { getShopSettings } from "@/lib/db/queries/settings";
import { formatCurrency, formatDate } from "@/lib/utils";
export const dynamic = "force-dynamic";
const SL: Record<string, { label: string; cl: string }> = { brouillon: { label: "Brouillon", cl: "bg-zinc-500/15 text-zinc-400" }, envoyee: { label: "Envoyée", cl: "bg-blue-500/15 text-blue-400" }, payee: { label: "Payée", cl: "bg-emerald-500/15 text-emerald-400" }, annulee: { label: "Annulée", cl: "bg-red-500/15 text-red-400" } };

export default async function InvoicesPage() {
  const { shopId } = await getAuthContext();
  const [invoices, stats, settings] = await Promise.all([getAllInvoices(shopId), getInvoiceStats(shopId), getShopSettings(shopId)]);
  if (!settings) return (<div className="space-y-6 page-enter"><div><h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Factures</h1></div><div className="bg-amber-500/[0.08] border border-amber-500/20 rounded-xl p-6"><h2 className="text-amber-300 font-semibold mb-2">Configuration requise</h2><p className="text-sm text-amber-400/80 mb-4">Configure tes informations légales dans Réglages avant d'émettre des factures.</p><Link href="/settings" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors">Configurer</Link></div></div>);

  return (
    <div className="space-y-6 page-enter">
      <div><h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Factures</h1><p className="text-zinc-500 mt-1 text-sm">{stats.total} facture{stats.total > 1 ? "s" : ""} · {formatCurrency(stats.totalAmount)} facturés</p></div>
      {stats.total > 0 && <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[{l:"Total",v:stats.total,icon:"FileText",ic:"text-zinc-400",bg:"bg-zinc-500/10"},{l:"Brouillons",v:stats.draft,icon:"FileText",ic:"text-zinc-400",bg:"bg-zinc-500/10"},{l:"Envoyees",v:stats.sent,icon:"FileText",ic:"text-blue-400",bg:"bg-blue-500/10"},{l:"Payees",v:stats.paid,icon:"FileText",ic:"text-emerald-400",bg:"bg-emerald-500/10"}].map((s) => <div key={s.l} className="kpi-card p-4 flex flex-col justify-between min-h-[100px]"><p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">{s.l}</p><p className={`text-[22px] font-bold mt-auto ${s.ic}`}>{s.v}</p></div>)}</div>}
      {invoices.length === 0 ? <div className="card-static p-12 text-center"><FileText size={40} className="mx-auto text-zinc-700 mb-3" /><p className="text-zinc-500 text-sm">Aucune facture. Va sur une vente avec client pour en créer une.</p></div> : (
        <div className="card-static overflow-hidden"><div className="divide-y divide-[var(--color-border)]">{invoices.map((inv) => { const st = SL[inv.status ?? "brouillon"]; return (
          <div key={inv.id} className="flex items-center justify-between px-5 py-3.5 row-hover transition-colors">
            <Link href={`/invoices/${inv.id}`} className="flex-1 flex items-center gap-4"><div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center"><FileText size={16} className="text-zinc-500" /></div><div><p className="text-[13px] font-medium text-zinc-200">{inv.invoiceNumber}</p><div className="flex items-center gap-2 mt-0.5"><span className="text-[11px] text-zinc-500">{inv.customerName ?? "Sans client"}</span><span className="text-zinc-700">·</span><span className="text-[11px] text-zinc-600">{formatDate(inv.createdAt)}</span></div></div></Link>
            <div className="flex items-center gap-4"><span className={`inline-flex px-2.5 py-1 rounded-md text-[11px] font-medium ${st.cl}`}>{st.label}</span><p className="text-[13px] font-medium text-white tabular-nums w-24 text-right">{formatCurrency(inv.amountTtc)}</p><a href={`/api/invoices/${inv.id}/pdf?download=1`} className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"><Download size={14} /></a></div>
          </div>); })}</div></div>
      )}
    </div>
  );
}
