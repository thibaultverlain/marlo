import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, MapPin, ShoppingBag } from "lucide-react";
import { getMissionById, getMissionItems } from "@/lib/db/queries/personal-shopping";
import { getAllCustomers } from "@/lib/db/queries/customers";
import { formatCurrency, formatDate } from "@/lib/utils";
import MissionDetailClient from "@/components/personal-shopping/mission-detail-client";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  planifie: { label: "Planifiée", className: "bg-blue-50 text-blue-700" },
  en_cours: { label: "En cours", className: "bg-amber-50 text-amber-700" },
  termine: { label: "Terminée", className: "bg-green-50 text-green-700" },
  facture: { label: "Facturée", className: "bg-stone-100 text-stone-700" },
  annule: { label: "Annulée", className: "bg-red-50 text-red-600" },
};

export default async function MissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [mission, items, customers] = await Promise.all([
    getMissionById(id),
    getMissionItems(id),
    getAllCustomers(),
  ]);

  if (!mission) notFound();

  const st = STATUS_MAP[mission.status ?? "planifie"] || STATUS_MAP.planifie;

  // Group items by customer
  const itemsByCustomer = items.reduce((acc, item) => {
    const key = item.customerId;
    if (!acc[key]) {
      acc[key] = {
        customerId: item.customerId,
        customerName: item.customerName ?? "Client supprimé",
        items: [],
        total: 0,
        commission: 0,
      };
    }
    acc[key].items.push(item);
    acc[key].total += item.purchasePrice;
    acc[key].commission += item.commissionAmount ?? 0;
    return acc;
  }, {} as Record<string, { customerId: string; customerName: string; items: typeof items; total: number; commission: number }>);

  const customerGroups = Object.values(itemsByCustomer);

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/personal-shopping" className="w-9 h-9 flex items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:text-stone-600 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <p className="text-xs text-stone-400">Mission personal shopping</p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl text-stone-900">{mission.name}</h1>
            <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-medium ${st.className}`}>
              {st.label}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
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

      {/* Totals */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-stone-200/60 p-5">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Articles achetés</p>
          <p className="text-2xl font-semibold text-stone-900">{items.length}</p>
          <p className="text-xs text-stone-400 mt-0.5">
            pour {customerGroups.length} client{customerGroups.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200/60 p-5">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Total acheté</p>
          <p className="text-2xl font-semibold text-stone-900">{formatCurrency(mission.totalPurchased)}</p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200/60 p-5">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Commissions</p>
          <p className="text-2xl font-semibold text-amber-700">{formatCurrency(mission.totalCommission)}</p>
        </div>
      </div>

      <MissionDetailClient
        missionId={mission.id}
        missionStatus={mission.status ?? "planifie"}
        customerGroups={customerGroups}
        customers={customers.map((c) => ({
          id: c.id,
          name: `${c.firstName} ${c.lastName}`,
          vip: c.vip ?? false,
        }))}
      />

      {mission.notes && (
        <div className="bg-white rounded-xl border border-stone-200/60 p-6">
          <h2 className="text-lg text-stone-900 mb-3">Notes</h2>
          <p className="text-sm text-stone-600 whitespace-pre-line">{mission.notes}</p>
        </div>
      )}

      <div className="pb-8" />
    </div>
  );
}
