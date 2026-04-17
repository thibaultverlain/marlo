import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Search, Clock, CheckCircle, XCircle, Package, User } from "lucide-react";
import { getSourcingById } from "@/lib/db/queries/sourcing";
import { getInStockProducts } from "@/lib/db/queries/products";
import { formatCurrency, formatDate } from "@/lib/utils";
import SourcingActions from "@/components/sourcing/sourcing-actions";

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

export default async function SourcingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [req, availableProducts] = await Promise.all([
    getSourcingById(id),
    getInStockProducts(),
  ]);

  if (!req) notFound();

  const st = STATUS_MAP[req.status ?? "ouvert"] || STATUS_MAP.ouvert;
  const Icon = st.icon;
  const commissionPct = req.commissionRate ? Number(req.commissionRate) * 100 : 0;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sourcing" className="w-9 h-9 flex items-center justify-center rounded-lg border border-stone-200 text-stone-400 hover:text-stone-600 transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <p className="text-xs text-stone-400">Demande créée le {formatDate(req.createdAt)}</p>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl text-stone-900">{req.description}</h1>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium ${st.color}`}>
              <Icon size={10} />
              {st.label}
            </span>
          </div>
        </div>
      </div>

      {/* Key info */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-stone-200/60 p-5">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Budget client</p>
          <p className="text-2xl font-semibold text-stone-900">
            {req.targetBudget ? formatCurrency(req.targetBudget) : "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-stone-200/60 p-5">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Commission</p>
          <p className="text-2xl font-semibold text-amber-700">
            {commissionPct > 0 ? `${commissionPct.toFixed(0)}%` : "—"}
          </p>
          {req.commissionAmount && (
            <p className="text-xs text-stone-400 mt-0.5">
              {formatCurrency(req.commissionAmount)} réalisée
            </p>
          )}
        </div>
        <div className="bg-white rounded-xl border border-stone-200/60 p-5">
          <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Deadline</p>
          <p className="text-lg font-semibold text-stone-900">
            {req.deadline ? formatDate(req.deadline) : "—"}
          </p>
          {req.deadline && (
            <p className="text-xs text-stone-400 mt-0.5">
              {Math.ceil((new Date(req.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} jours restants
            </p>
          )}
        </div>
      </div>

      {/* Client */}
      <div className="bg-white rounded-xl border border-stone-200/60 p-6">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-stone-400" />
          <h2 className="text-lg text-stone-900">Client demandeur</h2>
        </div>
        {req.customerId && req.customerName ? (
          <Link
            href={`/customers/${req.customerId}`}
            className="flex items-center justify-between p-3 -m-3 rounded-lg hover:bg-stone-50 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-stone-800">{req.customerName}</p>
              {req.customerEmail && <p className="text-xs text-stone-400 mt-0.5">{req.customerEmail}</p>}
            </div>
            <span className="text-xs text-amber-700">Voir fiche →</span>
          </Link>
        ) : (
          <p className="text-sm text-stone-400">Client introuvable</p>
        )}
      </div>

      {/* Specs */}
      <div className="bg-white rounded-xl border border-stone-200/60 p-6">
        <h2 className="text-lg text-stone-900 mb-4">Détails de la recherche</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
          {req.brand && (
            <div>
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Marque</p>
              <p className="text-stone-800 mt-0.5">{req.brand}</p>
            </div>
          )}
          {req.model && (
            <div>
              <p className="text-xs font-medium text-stone-400 uppercase tracking-wider">Modèle</p>
              <p className="text-stone-800 mt-0.5">{req.model}</p>
            </div>
          )}
        </div>
        {req.notes && (
          <div className="mt-4 pt-4 border-t border-stone-100">
            <p className="text-xs font-medium text-stone-400 uppercase tracking-wider mb-1">Notes</p>
            <p className="text-sm text-stone-600 whitespace-pre-line">{req.notes}</p>
          </div>
        )}
      </div>

      {/* Found product */}
      {req.foundProductId && (
        <div className="bg-green-50 border border-green-200/60 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle size={16} className="text-green-700" />
            <h2 className="text-lg text-green-900">Pièce trouvée</h2>
          </div>
          <Link
            href={`/products/${req.foundProductId}`}
            className="flex items-center justify-between p-3 -m-3 rounded-lg hover:bg-white/50 transition-colors"
          >
            <div>
              <p className="text-sm font-medium text-stone-800">{req.foundProductTitle}</p>
              <div className="flex items-center gap-3 mt-1 text-xs text-stone-500">
                <span>{req.foundProductSku}</span>
                {req.purchasePrice && <span>Achat : {formatCurrency(req.purchasePrice)}</span>}
                {req.salePrice && <span>Vente : {formatCurrency(req.salePrice)}</span>}
              </div>
            </div>
            {req.commissionAmount && (
              <div className="text-right">
                <p className="text-xs text-stone-500">Commission</p>
                <p className="text-sm font-semibold text-amber-700">{formatCurrency(req.commissionAmount)}</p>
              </div>
            )}
          </Link>
        </div>
      )}

      {/* Workflow actions */}
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
