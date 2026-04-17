import Link from "next/link";
import { Plus, Search, Clock, CheckCircle, XCircle, Package } from "lucide-react";
import { getAllSourcing, getSourcingStats } from "@/lib/db/queries/sourcing";
import { formatCurrency, formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_MAP: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ouvert: { label: "Ouvert", color: "bg-blue-50 text-blue-700", icon: Search },
  en_recherche: { label: "En recherche", color: "bg-amber-50 text-amber-700", icon: Clock },
  trouve: { label: "Trouvé", color: "bg-green-50 text-green-700", icon: CheckCircle },
  achete: { label: "Acheté", color: "bg-emerald-50 text-emerald-700", icon: Package },
  livre: { label: "Livré", color: "bg-stone-100 text-stone-600", icon: CheckCircle },
  facture: { label: "Facturé", color: "bg-stone-100 text-stone-700", icon: CheckCircle },
  annule: { label: "Annulé", color: "bg-red-50 text-red-600", icon: XCircle },
};

export default async function SourcingPage() {
  const [requests, stats] = await Promise.all([getAllSourcing(), getSourcingStats()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-stone-900">Sourcing</h1>
          <p className="text-stone-400 mt-1">
            {stats.active} recherche{stats.active > 1 ? "s" : ""} en cours
            {stats.totalCommissions > 0 && (
              <span className="text-stone-500 ml-2">
                · {formatCurrency(stats.totalCommissions)} de commissions générées
              </span>
            )}
          </p>
        </div>
        <Link
          href="/sourcing/new"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors"
        >
          <Plus size={16} />
          Nouvelle demande
        </Link>
      </div>

      {/* Stats */}
      {(stats.active + stats.found + stats.invoiced) > 0 && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-stone-200/60 p-4">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">En cours</p>
            <p className="text-2xl font-semibold text-stone-900 mt-1">{stats.active}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200/60 p-4">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Trouvé/Acheté</p>
            <p className="text-2xl font-semibold text-green-700 mt-1">{stats.found}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200/60 p-4">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Facturé</p>
            <p className="text-2xl font-semibold text-stone-900 mt-1">{stats.invoiced}</p>
          </div>
          <div className="bg-white rounded-xl border border-stone-200/60 p-4">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Commissions</p>
            <p className="text-2xl font-semibold text-amber-700 mt-1">{formatCurrency(stats.totalCommissions)}</p>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200/60 p-12 text-center">
          <Search size={40} className="mx-auto text-stone-300 mb-3" />
          <p className="text-stone-500 mb-4">Aucune demande de sourcing</p>
          <Link
            href="/sourcing/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <Plus size={14} />
            Créer ma première demande
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200/60 overflow-hidden">
          <div className="divide-y divide-stone-100">
            {requests.map((req) => {
              const st = STATUS_MAP[req.status ?? "ouvert"] || STATUS_MAP.ouvert;
              const Icon = st.icon;
              const commissionPct = req.commissionRate ? Number(req.commissionRate) * 100 : null;

              return (
                <Link
                  key={req.id}
                  href={`/sourcing/${req.id}`}
                  className="flex items-center justify-between px-6 py-4 hover:bg-stone-50/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-stone-800 truncate">{req.description}</p>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${st.color}`}>
                        <Icon size={10} />
                        {st.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {req.brand && <span className="text-xs text-stone-400">{req.brand}</span>}
                      {req.customerName && (
                        <>
                          <span className="text-stone-200">·</span>
                          <span className="text-xs text-stone-400">Pour {req.customerName}</span>
                        </>
                      )}
                      {req.deadline && (
                        <>
                          <span className="text-stone-200">·</span>
                          <span className="text-xs text-amber-600">Deadline : {formatDate(req.deadline)}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0 ml-4">
                    {req.targetBudget && (
                      <p className="text-sm font-semibold text-stone-800">
                        Budget : {formatCurrency(req.targetBudget)}
                      </p>
                    )}
                    {commissionPct !== null && (
                      <p className="text-xs text-stone-400">
                        Commission : {commissionPct.toFixed(0)}%
                        {req.commissionAmount && ` · ${formatCurrency(req.commissionAmount)}`}
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
