import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Search, Clock, CheckCircle, XCircle, Package, User } from "lucide-react";
import { getSourcingById } from "@/lib/db/queries/sourcing";
import { getInStockProducts } from "@/lib/db/queries/products";
import { formatCurrency, formatDate } from "@/lib/utils";
import SourcingActions from "@/components/sourcing/sourcing-actions";
export const dynamic = "force-dynamic";

export default async function SourcingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [req, availableProducts] = await Promise.all([getSourcingById(id), getInStockProducts()]);
  if (!req) notFound();
  const commissionPct = req.commissionRate ? Number(req.commissionRate) * 100 : 0;
  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/sourcing" className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors"><ArrowLeft size={18} /></Link>
        <div className="flex-1"><p className="text-[11px] text-zinc-600">Créée le {formatDate(req.createdAt)}</p><h1 className="text-2xl text-white">{req.description}</h1></div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5"><p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Budget</p><p className="text-2xl font-semibold text-white tabular-nums">{req.targetBudget ? formatCurrency(req.targetBudget) : "—"}</p></div>
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5"><p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Commission</p><p className="text-2xl font-semibold text-indigo-400">{commissionPct > 0 ? `${commissionPct.toFixed(0)}%` : "—"}</p>{req.commissionAmount && <p className="text-[11px] text-zinc-500 mt-0.5">{formatCurrency(req.commissionAmount)}</p>}</div>
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-5"><p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-1">Deadline</p><p className="text-lg font-semibold text-white">{req.deadline ? formatDate(req.deadline) : "—"}</p></div>
      </div>

      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6">
        <div className="flex items-center gap-2 mb-4"><User size={16} className="text-zinc-500" /><h2 className="text-[15px] font-semibold text-white">Client</h2></div>
        {req.customerId && req.customerName ? <Link href={`/customers/${req.customerId}`} className="flex items-center justify-between p-3 -m-3 rounded-lg hover:bg-[var(--color-bg-hover)] transition-colors"><p className="text-sm text-zinc-200">{req.customerName}</p><span className="text-xs text-indigo-400">Voir →</span></Link> : <p className="text-sm text-zinc-500">Inconnu</p>}
      </div>

      {(req.brand || req.model || req.notes) && <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6">
        <h2 className="text-[15px] font-semibold text-white mb-4">Détails</h2>
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">{req.brand && <div><p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Marque</p><p className="text-zinc-300 mt-0.5">{req.brand}</p></div>}{req.model && <div><p className="text-[11px] font-medium text-zinc-600 uppercase tracking-wider">Modèle</p><p className="text-zinc-300 mt-0.5">{req.model}</p></div>}</div>
        {req.notes && <div className="mt-4 pt-4 border-t border-[var(--color-border)]"><p className="text-sm text-zinc-400 whitespace-pre-line">{req.notes}</p></div>}
      </div>}

      {req.foundProductId && <div className="bg-emerald-500/[0.08] border border-emerald-500/20 rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4"><CheckCircle size={16} className="text-emerald-400" /><h2 className="text-[15px] font-semibold text-emerald-300">Pièce trouvée</h2></div>
        <Link href={`/products/${req.foundProductId}`} className="flex items-center justify-between"><div><p className="text-sm text-zinc-200">{req.foundProductTitle}</p><div className="flex items-center gap-3 mt-1 text-[11px] text-zinc-500"><span>{req.foundProductSku}</span>{req.purchasePrice && <span>Achat : {formatCurrency(req.purchasePrice)}</span>}{req.salePrice && <span>Vente : {formatCurrency(req.salePrice)}</span>}</div></div>{req.commissionAmount && <div className="text-right"><p className="text-[11px] text-zinc-500">Commission</p><p className="text-sm font-semibold text-indigo-400">{formatCurrency(req.commissionAmount)}</p></div>}</Link>
      </div>}

      <SourcingActions sourcingId={req.id} status={req.status ?? "ouvert"} hasFoundProduct={!!req.foundProductId} commissionRate={Number(req.commissionRate ?? 0)} availableProducts={availableProducts.map((p) => ({ id: p.id, title: p.title, sku: p.sku, purchasePrice: Number(p.purchasePrice), targetPrice: p.targetPrice ? Number(p.targetPrice) : null }))} />
      <div className="pb-8" />
    </div>
  );
}
