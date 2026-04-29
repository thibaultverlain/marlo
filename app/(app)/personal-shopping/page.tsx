import { getAuthContext } from "@/lib/auth/require-role";
import Link from "next/link";
import { Plus, ShoppingBag, Calendar, MapPin } from "lucide-react";
import { getAllMissions, getMissionStats } from "@/lib/db/queries/personal-shopping";
import { formatCurrency, formatDate } from "@/lib/utils";
export const dynamic = "force-dynamic";
const SM: Record<string, { label: string; cl: string }> = { planifie: { label: "Planifiée", cl: "bg-blue-500/15 text-blue-400" }, en_cours: { label: "En cours", cl: "bg-amber-500/15 text-amber-400" }, termine: { label: "Terminée", cl: "bg-emerald-500/15 text-emerald-400" }, facture: { label: "Facturée", cl: "bg-zinc-500/15 text-zinc-400" }, annule: { label: "Annulée", cl: "bg-red-500/15 text-red-400" } };

export default async function PersonalShoppingPage() {
  const { shopId } = await getAuthContext();
  const [missions, stats] = await Promise.all([getAllMissions(shopId), getMissionStats(shopId)]);
  return (
    <div className="space-y-6">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl lg:text-3xl text-white">Personal Shopping</h1><p className="text-zinc-500 mt-1 text-sm">{stats.total} mission{stats.total>1?"s":""}{stats.totalCommissions>0&&` · ${formatCurrency(stats.totalCommissions)} commissions`}</p></div>
        <Link href="/personal-shopping/new" className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"><Plus size={14} />Nouvelle mission</Link>
      </div>
      {missions.length === 0 ? <div className="card-static p-12 text-center"><ShoppingBag size={40} className="mx-auto text-zinc-700 mb-3" /><p className="text-zinc-500 mb-4 text-sm">Aucune mission</p><Link href="/personal-shopping/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"><Plus size={14} />Créer</Link></div> : (
        <div className="card-static overflow-hidden"><div className="divide-y divide-[var(--color-border)]">{missions.map((m) => { const st = SM[m.status??"planifie"]||SM.planifie; return (
          <Link key={m.id} href={`/personal-shopping/${m.id}`} className="flex items-start sm:items-center justify-between gap-3 px-5 py-3.5 row-hover transition-colors">
            <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><p className="text-[13px] font-medium text-zinc-200 truncate">{m.name}</p><span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium ${st.cl}`}>{st.label}</span></div><div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500">{m.eventDate&&<span className="flex items-center gap-1"><Calendar size={10}/>{formatDate(m.eventDate)}</span>}{m.location&&<span className="flex items-center gap-1"><MapPin size={10}/>{m.location}</span>}<span>{m.itemCount} article{m.itemCount>1?"s":""}</span></div></div>
            <div className="text-right flex-shrink-0 ml-4"><p className="text-[13px] font-medium text-zinc-200 tabular-nums">{formatCurrency(m.totalPurchased)}</p>{Number(m.totalCommission??0)>0&&<p className="text-[11px] text-rose-400">+{formatCurrency(m.totalCommission)}</p>}</div>
          </Link>); })}</div></div>
      )}
    </div>
  );
}
