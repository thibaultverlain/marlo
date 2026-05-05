"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  Package, Truck, CheckCircle2, RotateCcw, Clock,
  CreditCard, Copy, Check, X, ChevronRight,
} from "lucide-react";
import {
  updateShippingStatusAction,
  updatePaymentStatusAction,
  updateTrackingAction,
} from "@/lib/actions/orders";

type Order = {
  id: string;
  productId: string | null;
  customerId: string | null;
  channel: string;
  salePrice: string;
  shippingStatus: string | null;
  paymentStatus: string | null;
  trackingNumber: string | null;
  soldAt: Date;
  notes: string | null;
  productTitle: string | null;
  productBrand: string | null;
  productSku: string | null;
  customerFirstName: string | null;
  customerLastName: string | null;
};

type Counts = {
  total: number;
  aExpedier: number;
  expedie: number;
  livre: number;
  retourne: number;
  enAttentePaiement: number;
};

const SHIPPING_STATUS = {
  a_expedier: { label: "A expedier", icon: Package, cl: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
  expedie: { label: "Expedie", icon: Truck, cl: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
  livre: { label: "Livre", icon: CheckCircle2, cl: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  retourne: { label: "Retourne", icon: RotateCcw, cl: "text-red-400 bg-red-500/10 border-red-500/20" },
} as const;

const PAYMENT_STATUS = {
  en_attente: { label: "En attente", cl: "text-amber-400" },
  recu: { label: "Recu", cl: "text-emerald-400" },
  rembourse: { label: "Rembourse", cl: "text-red-400" },
} as const;

const CHANNELS: Record<string, string> = {
  vinted: "Vinted", vestiaire: "Vestiaire", stockx: "StockX", prive: "Prive", autre: "Autre",
};

function formatCurrency(v: string | number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(v));
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export default function OrdersPageClient({
  orders,
  counts,
  activeStatus,
}: {
  orders: Order[];
  counts: Counts;
  activeStatus: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [editingTracking, setEditingTracking] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  function handleShippingChange(saleId: string, status: string) {
    startTransition(async () => { await updateShippingStatusAction(saleId, status); });
  }

  function handlePaymentChange(saleId: string, status: string) {
    startTransition(async () => { await updatePaymentStatusAction(saleId, status); });
  }

  function handleTrackingSave(saleId: string) {
    if (!trackingInput.trim()) return;
    startTransition(async () => {
      await updateTrackingAction(saleId, trackingInput.trim());
      setEditingTracking(null);
      setTrackingInput("");
    });
  }

  function handleCopy(text: string, id: string) {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <>
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Commandes</h1>
        <p className="text-zinc-500 mt-1 text-sm">
          {counts.aExpedier > 0 && <span className="text-amber-400 font-medium">{counts.aExpedier} a expedier</span>}
          {counts.aExpedier > 0 && counts.expedie > 0 && " · "}
          {counts.expedie > 0 && <span className="text-blue-400">{counts.expedie} en transit</span>}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">A expedier</p>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center"><Package size={16} className="text-amber-400" /></div>
          </div>
          <p className={`text-[22px] font-bold tabular-nums mt-auto ${counts.aExpedier > 0 ? "text-amber-400" : "text-white"}`}>{counts.aExpedier}</p>
        </div>
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">En transit</p>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center"><Truck size={16} className="text-blue-400" /></div>
          </div>
          <p className="text-[22px] font-bold tabular-nums text-white mt-auto">{counts.expedie}</p>
        </div>
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Livres</p>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><CheckCircle2 size={16} className="text-emerald-400" /></div>
          </div>
          <p className="text-[22px] font-bold tabular-nums text-white mt-auto">{counts.livre}</p>
        </div>
        <div className="kpi-card p-4 flex flex-col justify-between min-h-[100px]">
          <div className="flex items-start justify-between">
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Paiement en attente</p>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center"><CreditCard size={16} className="text-rose-400" /></div>
          </div>
          <p className={`text-[22px] font-bold tabular-nums mt-auto ${counts.enAttentePaiement > 0 ? "text-rose-400" : "text-white"}`}>{counts.enAttentePaiement}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex bg-zinc-800/60 rounded-lg p-0.5 w-fit">
        {([
          { key: "a_expedier", label: `A expedier (${counts.aExpedier})` },
          { key: "expedie", label: `En transit (${counts.expedie})` },
          { key: "livre", label: `Livres (${counts.livre})` },
          { key: "all", label: `Tout (${counts.total})` },
        ] as const).map((f) => (
          <Link key={f.key} href={`/orders?status=${f.key}`}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${
              activeStatus === f.key ? "bg-[rgba(251,113,133,0.12)] text-rose-400" : "text-zinc-500 hover:text-zinc-300"
            }`}>
            {f.label}
          </Link>
        ))}
      </div>

      {/* Orders list */}
      {orders.length === 0 ? (
        <div className="card-static p-12 text-center">
          <Package size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm">Aucune commande {activeStatus === "a_expedier" ? "a expedier" : ""}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const ss = SHIPPING_STATUS[order.shippingStatus as keyof typeof SHIPPING_STATUS] ?? SHIPPING_STATUS.a_expedier;
            const ps = PAYMENT_STATUS[order.paymentStatus as keyof typeof PAYMENT_STATUS] ?? PAYMENT_STATUS.en_attente;
            const ShipIcon = ss.icon;
            const isEditingThis = editingTracking === order.id;

            return (
              <div key={order.id} className="card-static overflow-hidden">
                <div className="p-4 flex items-center gap-4 group">
                  {/* Status icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${ss.cl}`}>
                    <ShipIcon size={18} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-medium text-white truncate">
                        {order.productTitle ?? "Article"} {order.productBrand ? `— ${order.productBrand}` : ""}
                      </p>
                      <span className="text-[10px] text-zinc-600">{order.productSku}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px]">
                      <span className="text-zinc-500">{CHANNELS[order.channel] ?? order.channel}</span>
                      <span className="text-zinc-700">·</span>
                      <span className="text-white font-medium tabular-nums">{formatCurrency(order.salePrice)}</span>
                      <span className="text-zinc-700">·</span>
                      <span className={ps.cl}>{ps.label}</span>
                      {order.customerFirstName && (
                        <>
                          <span className="text-zinc-700">·</span>
                          <span className="text-zinc-500">{order.customerFirstName} {order.customerLastName}</span>
                        </>
                      )}
                      <span className="text-zinc-700">·</span>
                      <span className="text-zinc-600">{formatDate(order.soldAt)}</span>
                    </div>
                    {order.trackingNumber && !isEditingThis && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[11px] text-zinc-500">Suivi :</span>
                        <code className="text-[11px] text-blue-400 font-mono">{order.trackingNumber}</code>
                        <button onClick={() => handleCopy(order.trackingNumber!, order.id)}
                          className="p-0.5 rounded hover:bg-[var(--color-bg-hover)] text-zinc-600 hover:text-zinc-300 transition">
                          {copied === order.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    {order.shippingStatus === "a_expedier" && (
                      <button onClick={() => { setEditingTracking(order.id); setTrackingInput(order.trackingNumber ?? ""); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-lg hover:bg-rose-400 transition">
                        <Truck size={12} /> Expedier
                      </button>
                    )}
                    {order.shippingStatus === "expedie" && (
                      <button onClick={() => handleShippingChange(order.id, "livre")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition">
                        <CheckCircle2 size={12} /> Livre
                      </button>
                    )}
                    {order.paymentStatus === "en_attente" && (
                      <button onClick={() => handlePaymentChange(order.id, "recu")}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium text-zinc-400 bg-[var(--color-bg-hover)] rounded-lg hover:text-emerald-400 transition">
                        <CreditCard size={12} /> Paiement recu
                      </button>
                    )}
                    <Link href={`/sales/${order.id}`}
                      className="p-1.5 rounded-lg text-zinc-600 hover:text-zinc-300 hover:bg-[var(--color-bg-hover)] transition">
                      <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>

                {/* Tracking input panel */}
                {isEditingThis && (
                  <div className="border-t border-[var(--color-border)] p-4 bg-[var(--color-bg)]/30 flex items-center gap-3">
                    <Truck size={16} className="text-zinc-500 flex-shrink-0" />
                    <input type="text" placeholder="Numero de suivi (ex: 6A12345678901)" value={trackingInput}
                      onChange={(e) => setTrackingInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleTrackingSave(order.id)}
                      className="flex-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] font-mono"
                      autoFocus />
                    <button onClick={() => handleTrackingSave(order.id)} disabled={isPending}
                      className="px-4 py-2 text-[12px] font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-lg hover:bg-rose-400 transition disabled:opacity-50">
                      {isPending ? "..." : "Confirmer l'expedition"}
                    </button>
                    <button onClick={() => setEditingTracking(null)} className="text-zinc-500 hover:text-zinc-300">
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
