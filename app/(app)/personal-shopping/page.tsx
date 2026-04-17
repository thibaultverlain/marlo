import Link from "next/link";
import { Plus, ShoppingBag, Calendar, MapPin } from "lucide-react";
import { getAllMissions, getMissionStats } from "@/lib/db/queries/personal-shopping";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, { label: string; className: string }> = {
  planifie: { label: "Planifiée", className: "bg-blue-50 text-blue-700" },
  en_cours: { label: "En cours", className: "bg-amber-50 text-amber-700" },
  termine: { label: "Terminée", className: "bg-green-50 text-green-700" },
  facture: { label: "Facturée", className: "bg-stone-100 text-stone-700" },
  annule: { label: "Annulée", className: "bg-red-50 text-red-600" },
};

export default async function PersonalShoppingPage() {
  const [missions, stats] = await Promise.all([getAllMissions(), getMissionStats()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-stone-900">Personal Shopping</h1>
          <p className="text-stone-400 mt-1">
            {stats.total} mission{stats.total > 1 ? "s" : ""}
            {stats.totalCommissions > 0 && (
              <span className="ml-2">· {formatCurrency(stats.totalCommissions)} de commissions</span>
            )}
          </p>
        </div>
        <Link
          href="/personal-shopping/new"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors"
        >
          <Plus size={16} />
          Nouvelle mission
        </Link>
      </div>

      {stats.total > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-stone-200/60 p-4">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-semibold text-stone-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200/60 p-4">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Planifiées</p>
            <p className="text-2xl font-semibold text-blue-700 mt-1">{stats.planned}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200/60 p-4">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Terminées</p>
            <p className="text-2xl font-semibold text-green-700 mt-1">{stats.completed}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200/60 p-4">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Commissions</p>
            <p className="text-2xl font-semibold text-amber-700 mt-1">{formatCurrency(stats.totalCommissions)}</p>
          </div>
        </div>
      )}

      {missions.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200/60 p-12 text-center">
          <ShoppingBag size={40} className="mx-auto text-stone-300 mb-3" />
          <p className="text-stone-500 mb-4">Aucune mission de personal shopping</p>
          <Link
            href="/personal-shopping/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <Plus size={14} />
            Créer ma première mission
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200/60 overflow-hidden">
          <div className="divide-y divide-stone-100">
            {missions.map((m) => {
              const st = STATUS_MAP[m.status ?? "planifie"] || STATUS_MAP.planifie;
              return (
                <Link
                  key={m.id}
                  href={`/personal-shopping/${m.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-stone-50/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-stone-800 truncate">{m.name}</p>
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${st.className}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-stone-400">
                      {m.eventDate && (
                        <span className="flex items-center gap-1">
                          <Calendar size={10} />
                          {formatDate(m.eventDate)}
                        </span>
                      )}
                      {m.location && (
                        <span className="flex items-center gap-1">
                          <MapPin size={10} />
                          {m.location}
                        </span>
                      )}
                      <span>
                        {m.itemCount} article{m.itemCount > 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="text-sm font-semibold text-stone-800">
                      {formatCurrency(m.totalPurchased)}
                    </p>
                    {Number(m.totalCommission ?? 0) > 0 && (
                      <p className="text-xs text-amber-700">
                        +{formatCurrency(m.totalCommission)} commission
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
