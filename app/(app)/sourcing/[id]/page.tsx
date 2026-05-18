import { getAuthContext } from "@/lib/auth/require-role";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, User, CheckCircle, Wallet, Calendar, Target, Flame, Clock } from "lucide-react";
import { getSourcingById } from "@/lib/db/queries/sourcing";
import { getInStockProducts } from "@/lib/db/queries/products";
import { formatCurrency, formatDate } from "@/lib/utils";
import SourcingActions from "@/components/sourcing/sourcing-actions";
import SourcingHeaderActions from "@/components/sourcing/sourcing-header-actions";

export const revalidate = 30;

function daysUntil(d: Date | string | null): number | null {
  if (!d) return null;
  const target = new Date(d).getTime();
  return Math.ceil((target - Date.now()) / (1000 * 60 * 60 * 24));
}

export default async function SourcingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { shopId } = await getAuthContext();
  const [req, availableProducts] = await Promise.all([getSourcingById(id), getInStockProducts(shopId)]);
  if (!req) notFound();

  const commissionPct = req.commissionRate ? Number(req.commissionRate) * 100 : 0;
  const days = req.deadline ? daysUntil(req.deadline) : null;
  const isActive = ["ouvert", "en_recherche"].includes(req.status ?? "");
  const isUrgent = isActive && days !== null && days <= 3 && days >= 0;
  const isWarning = isActive && days !== null && days <= 7 && days > 3;
  const isOverdue = isActive && days !== null && days < 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 page-enter">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <Link
            href="/sourcing"
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors flex-shrink-0"
          >
            <ArrowLeft size={18} />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-zinc-600">Creee le {formatDate(req.createdAt)}</p>
            <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">{req.description}</h1>
          </div>
        </div>
        <SourcingHeaderActions sourcingId={req.id} customerId={req.customerId} description={req.description} />
      </div>

      {/* Urgence banner */}
      {(isOverdue || isUrgent) && (
        <div className="flex items-center gap-3 bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <Flame size={16} className="text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-red-300">
              {isOverdue ? `Deadline depassee depuis ${Math.abs(days!)} jour${Math.abs(days!) > 1 ? "s" : ""}` : `Deadline dans ${days} jour${days! > 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      )}

      {/* KPIs avec icones */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Budget cible</p>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center"><Target size={15} className="text-blue-400" /></div>
          </div>
          <p className="text-[22px] font-bold tabular-nums text-white mt-auto">
            {req.targetBudget ? formatCurrency(req.targetBudget) : "—"}
          </p>
        </div>
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Commission</p>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center"><Wallet size={15} className="text-rose-400" /></div>
          </div>
          <div className="mt-auto">
            <p className="text-[22px] font-bold tabular-nums text-rose-400">
              {commissionPct > 0 ? `${commissionPct.toFixed(0)}%` : "—"}
            </p>
            {req.commissionAmount && (
              <p className="text-[11px] text-zinc-500 mt-0.5">{formatCurrency(req.commissionAmount)}</p>
            )}
          </div>
        </div>
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Deadline</p>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              isOverdue || isUrgent ? "bg-red-500/10" : isWarning ? "bg-amber-500/10" : "bg-zinc-500/10"
            }`}>
              <Calendar size={15} className={
                isOverdue || isUrgent ? "text-red-400" : isWarning ? "text-amber-400" : "text-zinc-400"
              } />
            </div>
          </div>
          <div className="mt-auto">
            <p className={`text-[18px] font-bold ${
              isOverdue || isUrgent ? "text-red-400" : isWarning ? "text-amber-400" : "text-white"
            }`}>
              {req.deadline ? formatDate(req.deadline) : "—"}
            </p>
            {days !== null && isActive && (
              <p className={`text-[11px] mt-0.5 ${
                isOverdue ? "text-red-400" : isUrgent ? "text-red-400" : isWarning ? "text-amber-400" : "text-zinc-600"
              }`}>
                {isOverdue ? `J+${Math.abs(days)}` : `J-${days}`}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card-static p-6">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-zinc-500" />
          <h2 className="text-[15px] font-semibold text-white">Client</h2>
        </div>
        {req.customerId && req.customerName ? (
          <Link
            href={`/customers/${req.customerId}`}
            className="flex items-center justify-between p-3 -m-3 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"
          >
            <p className="text-sm text-zinc-200">{req.customerName}</p>
            <span className="text-xs text-rose-400">Voir →</span>
          </Link>
        ) : (
          <p className="text-sm text-zinc-500">Inconnu</p>
        )}
      </div>

      {(req.brand || req.model || req.notes) && (
        <div className="card-static p-6">
          <h2 className="text-[15px] font-semibold text-white mb-4">Details</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
            {req.brand && (
              <div>
                <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Marque</p>
                <p className="text-zinc-300 mt-0.5">{req.brand}</p>
              </div>
            )}
            {req.model && (
              <div>
                <p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Modele</p>
                <p className="text-zinc-300 mt-0.5">{req.model}</p>
              </div>
            )}
          </div>
          {req.notes && (
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <p className="text-sm text-zinc-400 whitespace-pre-line">{req.notes}</p>
            </div>
          )}
        </div>
      )}

      {req.foundProductId && (
        <div className="bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={16} className="text-emerald-400" />
            <h2 className="text-[15px] font-semibold text-emerald-300">Piece trouvee</h2>
          </div>
          <Link
            href={`/products/${req.foundProductId}`}
            className="flex items-center justify-between"
          >
            <div>
              <p className="text-sm text-zinc-200">{req.foundProductTitle}</p>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500 flex-wrap">
                <span>{req.foundProductSku}</span>
                {req.purchasePrice && <span>Achat : {formatCurrency(req.purchasePrice)}</span>}
                {req.salePrice && <span>Vente : {formatCurrency(req.salePrice)}</span>}
              </div>
            </div>
            {req.commissionAmount && (
              <div className="text-right">
                <p className="text-[11px] text-zinc-500">Commission</p>
                <p className="text-sm font-semibold text-rose-400">{formatCurrency(req.commissionAmount)}</p>
              </div>
            )}
          </Link>
        </div>
      )}

      <SourcingActions
        sourcingId={req.id}
        status={req.status ?? "ouvert"}
        hasFoundProduct={!!req.foundProductId}
        commissionRate={Number(req.commissionRate ?? 0)}
        availableProducts={availableProducts.map((p) => ({
          id: p.id,
          title: p.title,
          sku: p.sku,
          purchasePrice: Number(p.purchasePrice),
          targetPrice: p.targetPrice ? Number(p.targetPrice) : null,
        }))}
      />
      <div className="pb-8" />
    </div>
  );
}
