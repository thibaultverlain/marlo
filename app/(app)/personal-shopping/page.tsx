import { getAuthContext } from "@/lib/auth/require-role";
import Link from "next/link";
import { Plus, ShoppingBag, Calendar, Clock, Wallet, Flame } from "lucide-react";
import { getAllMissions, getMissionStats } from "@/lib/db/queries/personal-shopping";
import { formatCurrency } from "@/lib/utils";
import MissionsListClient from "@/components/personal-shopping/missions-list-client";

export const revalidate = 30;

function daysUntil(d: Date | string | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function PersonalShoppingPage() {
  const { shopId } = await getAuthContext();
  const [missions, stats] = await Promise.all([getAllMissions(shopId), getMissionStats(shopId)]);

  const upcoming = missions.filter((m) => m.status === "planifie").length;
  const inProgress = missions.filter((m) => m.status === "en_cours").length;

  // Imminentes (planifie ou en_cours avec event_date dans < 7 jours)
  const imminentCount = missions.filter((m) => {
    if (!m.eventDate || !["planifie", "en_cours"].includes(m.status ?? "")) return false;
    const days = daysUntil(m.eventDate);
    return days !== null && days <= 7 && days >= 0;
  }).length;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Personal Shopping</h1>
          <p className="text-zinc-500 mt-1 text-sm">{stats.total} mission{stats.total > 1 ? "s" : ""}</p>
        </div>
        <Link
          href="/personal-shopping/new"
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"
        >
          <Plus size={14} />
          Nouvelle mission
        </Link>
      </div>

      {/* KPIs */}
      {missions.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Total</p>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><ShoppingBag size={16} className="text-emerald-400" /></div>
            </div>
            <p className="text-[22px] font-bold tabular-nums text-white mt-auto">{stats.total}</p>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">A venir</p>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center"><Calendar size={16} className="text-rose-400" /></div>
            </div>
            <p className={`text-[22px] font-bold tabular-nums mt-auto ${upcoming > 0 ? "text-rose-400" : "text-white"}`}>{upcoming}</p>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">En cours</p>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center"><Clock size={16} className="text-amber-400" /></div>
            </div>
            <p className={`text-[22px] font-bold tabular-nums mt-auto ${inProgress > 0 ? "text-amber-400" : "text-white"}`}>{inProgress}</p>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Commissions</p>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Wallet size={16} className="text-emerald-400" /></div>
            </div>
            <p className="text-[20px] font-bold tabular-nums text-emerald-400 mt-auto">{formatCurrency(stats.totalCommissions)}</p>
          </div>
        </div>
      )}

      {/* Bandeau urgence */}
      {imminentCount > 0 && (
        <div className="flex items-center gap-3 bg-amber-500/[0.08] border border-amber-500/20 rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <Flame size={16} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-amber-300">
              {imminentCount} mission{imminentCount > 1 ? "s" : ""} dans moins de 7 jours
            </p>
          </div>
        </div>
      )}

      {missions.length === 0 ? (
        <div className="card-static p-12 text-center">
          <ShoppingBag size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 mb-4 text-sm">Aucune mission</p>
          <Link
            href="/personal-shopping/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"
          >
            <Plus size={14} />
            Creer une mission
          </Link>
        </div>
      ) : (
        <MissionsListClient missions={missions.map((m) => ({
          id: m.id,
          name: m.name,
          status: m.status,
          eventDate: m.eventDate,
          location: m.location,
          itemCount: m.itemCount,
          totalPurchased: m.totalPurchased,
          totalCommission: m.totalCommission,
          createdAt: m.createdAt,
        }))} />
      )}
    </div>
  );
}
