import { getAuthContext } from "@/lib/auth/require-role";
import Link from "next/link";
import { Plus, Search, Clock, CheckCircle, Wallet, Flame } from "lucide-react";
import { getAllSourcing, getSourcingStats } from "@/lib/db/queries/sourcing";
import { formatCurrency } from "@/lib/utils";
import SourcingListClient from "@/components/sourcing/sourcing-list-client";

export const revalidate = 30;

function daysUntil(d: Date | string | null | undefined): number | null {
  if (!d) return null;
  const target = new Date(d).getTime();
  const now = Date.now();
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

export default async function SourcingPage() {
  const { shopId } = await getAuthContext();
  const [requests, stats] = await Promise.all([getAllSourcing(shopId), getSourcingStats(shopId)]);

  // Compute deadlines proches
  const deadlinesSoon = requests.filter((r) => {
    if (!r.deadline || !["ouvert", "en_recherche"].includes(r.status ?? "")) return false;
    const days = daysUntil(r.deadline);
    return days !== null && days <= 7 && days >= 0;
  }).length;

  // Trouves a livrer (status trouve ou achete)
  const toDeliver = requests.filter((r) => ["trouve", "achete"].includes(r.status ?? "")).length;

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Sourcing</h1>
          <p className="text-zinc-500 mt-1 text-sm">{stats.active} en cours</p>
        </div>
        <Link
          href="/sourcing/new"
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"
        >
          <Plus size={14} />
          Nouvelle demande
        </Link>
      </div>

      {/* KPIs */}
      {requests.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">En cours</p>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Search size={16} className="text-emerald-400" /></div>
            </div>
            <p className="text-[22px] font-bold tabular-nums text-white mt-auto">{stats.active}</p>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">A livrer</p>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center"><CheckCircle size={16} className="text-amber-400" /></div>
            </div>
            <p className={`text-[22px] font-bold tabular-nums mt-auto ${toDeliver > 0 ? "text-amber-400" : "text-white"}`}>{toDeliver}</p>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Deadlines proches</p>
              <div className="w-8 h-8 rounded-xl bg-red-500/10 flex items-center justify-center"><Clock size={16} className="text-red-400" /></div>
            </div>
            <p className={`text-[22px] font-bold tabular-nums mt-auto ${deadlinesSoon > 0 ? "text-red-400" : "text-white"}`}>{deadlinesSoon}</p>
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
      {deadlinesSoon > 0 && (
        <div className="flex items-center gap-3 bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <Flame size={16} className="text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-red-300">
              {deadlinesSoon} demande{deadlinesSoon > 1 ? "s" : ""} avec deadline dans moins de 7 jours
            </p>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="card-static p-12 text-center">
          <Search size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 mb-4 text-sm">Aucune demande de sourcing</p>
          <Link
            href="/sourcing/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"
          >
            <Plus size={14} />
            Creer une demande
          </Link>
        </div>
      ) : (
        <SourcingListClient requests={requests.map((r) => ({
          id: r.id,
          description: r.description,
          brand: r.brand,
          model: r.model,
          status: r.status,
          customerId: r.customerId,
          customerName: r.customerName,
          targetBudget: r.targetBudget,
          commissionRate: r.commissionRate,
          commissionAmount: r.commissionAmount,
          deadline: r.deadline,
          createdAt: r.createdAt,
        }))} />
      )}
    </div>
  );
}
