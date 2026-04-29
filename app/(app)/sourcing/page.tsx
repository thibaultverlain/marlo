import { getCurrentUserId } from "@/lib/auth/get-user";
import Link from "next/link";
import { Plus, Search, Clock, CheckCircle, XCircle, Package } from "lucide-react";
import { getAllSourcing, getSourcingStats } from "@/lib/db/queries/sourcing";
import { formatCurrency, formatDate } from "@/lib/utils";
export const dynamic = "force-dynamic";
const SM: Record<string, { label: string; cl: string; icon: React.ElementType }> = {
  ouvert: { label: "Ouvert", cl: "bg-blue-500/15 text-blue-400", icon: Search }, en_recherche: { label: "En recherche", cl: "bg-amber-500/15 text-amber-400", icon: Clock },
  trouve: { label: "Trouvé", cl: "bg-emerald-500/15 text-emerald-400", icon: CheckCircle }, achete: { label: "Acheté", cl: "bg-emerald-500/15 text-emerald-400", icon: Package },
  livre: { label: "Livré", cl: "bg-zinc-500/15 text-zinc-400", icon: CheckCircle }, facture: { label: "Facturé", cl: "bg-zinc-500/15 text-zinc-400", icon: CheckCircle },
  annule: { label: "Annulé", cl: "bg-red-500/15 text-red-400", icon: XCircle },
};
export default async function SourcingPage() {
  const userId = await getCurrentUserId();
  const [requests, stats] = await Promise.all([getAllSourcing(userId), getSourcingStats(userId)]);
  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl lg:text-3xl text-white">Sourcing</h1><p className="text-zinc-500 mt-1 text-sm">{stats.active} en cours{stats.totalCommissions > 0 && ` · ${formatCurrency(stats.totalCommissions)} commissions`}</p></div>
        <Link href="/sourcing/new" className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"><Plus size={14} />Nouvelle demande</Link>
      </div>
      {requests.length === 0 ? <div className="card-static p-12 text-center"><Search size={40} className="mx-auto text-zinc-700 mb-3" /><p className="text-zinc-500 mb-4 text-sm">Aucune demande</p><Link href="/sourcing/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"><Plus size={14} />Créer</Link></div> : (
        <div className="card-static overflow-hidden"><div className="divide-y divide-[var(--color-border)]">{requests.map((req) => {
          const st = SM[req.status ?? "ouvert"] || SM.ouvert; const Icon = st.icon;
          return <Link key={req.id} href={`/sourcing/${req.id}`} className="flex items-start sm:items-center justify-between gap-3 px-5 py-3.5 row-hover transition-colors">
            <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="text-[13px] font-medium text-zinc-200 truncate">{req.description}</p><span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${st.cl}`}><Icon size={10} />{st.label}</span></div><div className="flex items-center gap-2 mt-1">{req.brand && <span className="text-[11px] text-zinc-500">{req.brand}</span>}{req.customerName && <><span className="text-zinc-700">·</span><span className="text-[11px] text-zinc-500">Pour {req.customerName}</span></>}{req.deadline && <><span className="text-zinc-700">·</span><span className="text-[11px] text-amber-400">Deadline : {formatDate(req.deadline)}</span></>}</div></div>
            <div className="text-right flex-shrink-0 ml-4">{req.targetBudget && <p className="text-[13px] font-medium text-zinc-200 tabular-nums">{formatCurrency(req.targetBudget)}</p>}{req.commissionRate && <p className="text-[11px] text-zinc-500">{(Number(req.commissionRate)*100).toFixed(0)}%{req.commissionAmount && ` · ${formatCurrency(req.commissionAmount)}`}</p>}</div>
          </Link>;
        })}</div></div>
      )}
    </div>
  );
}
