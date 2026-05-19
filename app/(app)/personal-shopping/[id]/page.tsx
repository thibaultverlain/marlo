import { getAuthContext } from "@/lib/auth/require-role";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, Package, Wallet, TrendingUp, Flame } from "lucide-react";
import { getMissionById, getMissionItems } from "@/lib/db/queries/personal-shopping";
import { getAllCustomers } from "@/lib/db/queries/customers";
import { formatCurrency, formatDate } from "@/lib/utils";
import MissionDetailClient from "@/components/personal-shopping/mission-detail-client";
import MissionHeaderActions from "@/components/personal-shopping/mission-header-actions";

export const revalidate = 30;

function daysUntil(d: Date | string | null): number | null {
  if (!d) return null;
  return Math.ceil((new Date(d).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function MissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { shopId } = await getAuthContext();
  const [mission, items, customers] = await Promise.all([
    getMissionById(id),
    getMissionItems(id),
    getAllCustomers(shopId),
  ]);
  if (!mission) notFound();

  const itemsByCustomer = items.reduce((acc, item) => {
    const k = item.customerId;
    if (!acc[k]) acc[k] = { customerId: item.customerId, customerName: item.customerName ?? "Supprime", items: [], total: 0, commission: 0 };
    acc[k].items.push(item);
    acc[k].total += item.purchasePrice;
    acc[k].commission += item.commissionAmount ?? 0;
    return acc;
  }, {} as Record<string, any>);

  const days = mission.eventDate ? daysUntil(mission.eventDate) : null;
  const isActive = ["planifie", "en_cours"].includes(mission.status ?? "");
  const isImminent = isActive && days !== null && days >= 0 && days <= 7;
  const isPast = isActive && days !== null && days < 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 page-enter">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            href="/personal-shopping"
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-zinc-600">Mission personal shopping</p>
            <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">{mission.name}</h1>
            <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500 flex-wrap">
              {mission.eventDate && (
                <span className="flex items-center gap-1">
                  <Calendar size={10} />
                  {formatDate(mission.eventDate)}
                </span>
              )}
              {mission.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={10} />
                  {mission.location}
                </span>
              )}
            </div>
          </div>
        </div>
        <MissionHeaderActions missionId={mission.id} missionName={mission.name} />
      </div>

      {/* Bandeau urgence */}
      {(isImminent || isPast) && (
        <div className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
          isPast ? "bg-red-500/[0.08] border border-red-500/20" : "bg-amber-500/[0.08] border border-amber-500/20"
        }`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isPast ? "bg-red-500/15" : "bg-amber-500/15"
          }`}>
            <Flame size={16} className={isPast ? "text-red-400" : "text-amber-400"} />
          </div>
          <div className="flex-1">
            <p className={`text-[13px] font-semibold ${isPast ? "text-red-300" : "text-amber-300"}`}>
              {isPast ? `Date depassee depuis ${Math.abs(days!)} jour${Math.abs(days!) > 1 ? "s" : ""}` : `Mission dans ${days} jour${days! > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      )}

      {/* KPIs avec icones */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Articles</p>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center"><Package size={15} className="text-blue-400" /></div>
          </div>
          <p className="text-[22px] font-bold text-white mt-auto">{items.length}</p>
        </div>
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Total achete</p>
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center"><TrendingUp size={15} className="text-violet-400" /></div>
          </div>
          <p className="text-[22px] font-bold text-white tabular-nums mt-auto">{formatCurrency(mission.totalPurchased)}</p>
        </div>
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Commissions</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Wallet size={15} className="text-emerald-400" /></div>
          </div>
          <p className="text-[22px] font-bold text-emerald-400 tabular-nums mt-auto">{formatCurrency(mission.totalCommission)}</p>
        </div>
      </div>

      <MissionDetailClient
        missionId={mission.id}
        missionStatus={mission.status ?? "planifie"}
        customerGroups={Object.values(itemsByCustomer)}
        customers={customers.map((c) => ({ id: c.id, name: `${c.firstName} ${c.lastName}`, vip: c.vip ?? false }))}
      />
      {mission.notes && (
        <div className="card-static p-6">
          <h2 className="text-[15px] font-semibold text-white mb-3">Notes</h2>
          <p className="text-sm text-zinc-400 whitespace-pre-line">{mission.notes}</p>
        </div>
      )}
      <div className="pb-8" />
    </div>
  );
}
