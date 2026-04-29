import { getCurrentUserId } from "@/lib/auth/get-user";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, ShoppingBag } from "lucide-react";
import { getMissionById, getMissionItems } from "@/lib/db/queries/personal-shopping";
import { getAllCustomers } from "@/lib/db/queries/customers";
import { formatCurrency, formatDate } from "@/lib/utils";
import MissionDetailClient from "@/components/personal-shopping/mission-detail-client";
export const dynamic = "force-dynamic";

export default async function MissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const userId = await getCurrentUserId();
  const [mission, items, customers] = await Promise.all([getMissionById(id), getMissionItems(id), getAllCustomers(userId)]);
  if (!mission) notFound();
  const itemsByCustomer = items.reduce((acc, item) => { const k = item.customerId; if (!acc[k]) acc[k] = { customerId: item.customerId, customerName: item.customerName ?? "Supprimé", items: [], total: 0, commission: 0 }; acc[k].items.push(item); acc[k].total += item.purchasePrice; acc[k].commission += item.commissionAmount ?? 0; return acc; }, {} as Record<string, any>);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/personal-shopping" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors"><ArrowLeft size={18} /></Link>
        <div className="flex-1"><p className="text-[11px] text-zinc-600">Mission personal shopping</p><h1 className="text-2xl text-white">{mission.name}</h1><div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500">{mission.eventDate&&<span className="flex items-center gap-1"><Calendar size={10}/>{formatDate(mission.eventDate)}</span>}{mission.location&&<span className="flex items-center gap-1"><MapPin size={10}/>{mission.location}</span>}</div></div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <div className="card-static p-5"><p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Articles</p><p className="text-2xl font-semibold text-white">{items.length}</p></div>
        <div className="card-static p-5"><p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Total</p><p className="text-2xl font-semibold text-white tabular-nums">{formatCurrency(mission.totalPurchased)}</p></div>
        <div className="card-static p-5"><p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Commissions</p><p className="text-2xl font-semibold text-rose-400 tabular-nums">{formatCurrency(mission.totalCommission)}</p></div>
      </div>
      <MissionDetailClient missionId={mission.id} missionStatus={mission.status??"planifie"} customerGroups={Object.values(itemsByCustomer)} customers={customers.map((c)=>({id:c.id,name:`${c.firstName} ${c.lastName}`,vip:c.vip??false}))} />
      {mission.notes&&<div className="card-static p-6"><h2 className="text-[15px] font-semibold text-white mb-3">Notes</h2><p className="text-sm text-zinc-400 whitespace-pre-line">{mission.notes}</p></div>}
      <div className="pb-8" />
    </div>
  );
}
