"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package, Truck, CheckCircle2, RotateCcw, Clock,
  CreditCard, Copy, Check, X, ChevronRight, Search,
  ArrowUpDown, ChevronDown, AlertTriangle, Flame, ExternalLink,
} from "lucide-react";
import { getTrackingUrl } from "@/lib/tracking";
import {
  updateShippingStatusAction,
  updatePaymentStatusAction,
  updateTrackingAction,
  bulkUpdateShippingAction,
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
  prepChecklist: Record<string, boolean> | null;
  disputeStatus: string | null;
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
  expedie: { label: "Expedie", icon: Truck, cl: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  livre: { label: "Livre", icon: CheckCircle2, cl: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
  retourne: { label: "Retourne", icon: RotateCcw, cl: "text-red-400 bg-red-500/10 border-red-500/20" },
} as const;

const CHANNELS: Record<string, string> = {
  vinted: "Vinted", vestiaire: "Vestiaire", stockx: "StockX", prive: "Prive", autre: "Autre",
};

const SORT_OPTIONS = [
  { value: "urgency", label: "Plus urgent" },
  { value: "recent", label: "Plus recent" },
  { value: "price_desc", label: "Prix decroissant" },
  { value: "price_asc", label: "Prix croissant" },
];

function formatCurrency(v: string | number): string {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(Number(v));
}

function relativeDate(d: Date): string {
  const now = Date.now();
  const date = new Date(d).getTime();
  const diffMs = now - date;
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "a l'instant";
  if (diffHours < 24) return `il y a ${diffHours}h`;
  if (diffDays === 1) return "hier";
  if (diffDays < 7) return `il y a ${diffDays}j`;
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
}

function daysSinceSold(d: Date): number {
  return Math.floor((Date.now() - new Date(d).getTime()) / (1000 * 60 * 60 * 24));
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
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingTracking, setEditingTracking] = useState<string | null>(null);
  const [trackingInput, setTrackingInput] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("urgency");
  const [showSort, setShowSort] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Urgent orders count (a_expedier depuis > 3 jours)
  const urgentCount = orders.filter(
    (o) => o.shippingStatus === "a_expedier" && daysSinceSold(o.soldAt) > 3
  ).length;

  const filtered = useMemo(() => {
    let list = orders.filter((o) => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        o.productTitle?.toLowerCase().includes(q) ||
        o.productBrand?.toLowerCase().includes(q) ||
        o.productSku?.toLowerCase().includes(q) ||
        o.trackingNumber?.toLowerCase().includes(q) ||
        o.customerFirstName?.toLowerCase().includes(q) ||
        o.customerLastName?.toLowerCase().includes(q)
      );
    });

    list = [...list];
    switch (sort) {
      case "recent":
        list.sort((a, b) => new Date(b.soldAt).getTime() - new Date(a.soldAt).getTime());
        break;
      case "price_desc":
        list.sort((a, b) => Number(b.salePrice) - Number(a.salePrice));
        break;
      case "price_asc":
        list.sort((a, b) => Number(a.salePrice) - Number(b.salePrice));
        break;
      case "urgency":
      default:
        // Plus ancien d'abord (= plus urgent)
        list.sort((a, b) => new Date(a.soldAt).getTime() - new Date(b.soldAt).getTime());
    }
    return list;
  }, [orders, search, sort]);

  function handleShippingChange(saleId: string, status: string) {
    startTransition(async () => { await updateShippingStatusAction(saleId, status); });
  }

  function handlePaymentChange(saleId: string, status: string) {
    startTransition(async () => { await updatePaymentStatusAction(saleId, status); });
  }

  function handleTrackingSave(saleId: string) {
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

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map((o) => o.id)));
  }

  function handleBulkStatus(status: string) {
    startTransition(async () => {
      await bulkUpdateShippingAction(Array.from(selected), status);
      setSelected(new Set());
      router.refresh();
    });
  }

  const hasSelection = selected.size > 0;
  const selectedStatus = activeStatus;

  return (
    <>
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Commandes</h1>
        <p className="text-zinc-500 mt-1 text-sm">
          {counts.aExpedier > 0 && <span className="text-amber-400 font-medium">{counts.aExpedier} a expedier</span>}
          {counts.aExpedier > 0 && counts.expedie > 0 && " · "}
          {counts.expedie > 0 && <span className="text-emerald-400">{counts.expedie} en transit</span>}
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
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Truck size={16} className="text-emerald-400" /></div>
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
            <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Paiement attendu</p>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center"><CreditCard size={16} className="text-rose-400" /></div>
          </div>
          <p className={`text-[22px] font-bold tabular-nums mt-auto ${counts.enAttentePaiement > 0 ? "text-rose-400" : "text-white"}`}>{counts.enAttentePaiement}</p>
        </div>
      </div>

      {/* Bandeau urgent */}
      {urgentCount > 0 && selectedStatus === "a_expedier" && (
        <div className="flex items-center gap-3 bg-red-500/[0.08] border border-red-500/20 rounded-xl px-4 py-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <Flame size={16} className="text-red-400" />
          </div>
          <div className="flex-1">
            <p className="text-[13px] font-semibold text-red-300">
              {urgentCount} commande{urgentCount > 1 ? "s" : ""} en attente depuis plus de 3 jours
            </p>
            <p className="text-[11px] text-red-400/70 mt-0.5">A expedier en priorite</p>
          </div>
        </div>
      )}

      {/* Filters tabs */}
      <div className="flex bg-zinc-800/60 rounded-lg p-0.5 w-fit overflow-x-auto">
        {([
          { key: "a_expedier", label: `A expedier (${counts.aExpedier})` },
          { key: "expedie", label: `En transit (${counts.expedie})` },
          { key: "livre", label: `Livres (${counts.livre})` },
          { key: "all", label: `Tout (${counts.total})` },
        ] as const).map((f) => (
          <Link key={f.key} href={`/orders?status=${f.key}`}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all whitespace-nowrap ${
              activeStatus === f.key ? "bg-[var(--color-accent-muted)] text-rose-400" : "text-zinc-500 hover:text-zinc-300"
            }`}>
            {f.label}
          </Link>
        ))}
      </div>

      {/* Search + sort */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Rechercher (article, marque, SKU, client, tracking)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-[13px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500/50 text-zinc-200 placeholder:text-zinc-500"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowSort(!showSort)}
            className="flex items-center gap-2 px-3 py-2 text-[13px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:text-zinc-200 text-zinc-400"
          >
            <ArrowUpDown size={13} />
            <span className="hidden sm:inline">{SORT_OPTIONS.find((s) => s.value === sort)?.label}</span>
            <ChevronDown size={12} />
          </button>
          {showSort && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowSort(false)} />
              <div className="absolute right-0 top-full mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg shadow-xl shadow-black/30 py-1 z-50 min-w-[180px]">
                {SORT_OPTIONS.map((opt) => (
                  <button key={opt.value}
                    onClick={() => { setSort(opt.value); setShowSort(false); }}
                    className={`w-full px-3 py-1.5 text-left text-[13px] hover:bg-[var(--color-bg-hover)] transition ${sort === opt.value ? "text-rose-400 font-medium" : "text-zinc-300"}`}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bulk actions */}
      {hasSelection && (
        <div className="card-static p-3 flex items-center gap-3 flex-wrap">
          <span className="text-[12px] text-zinc-400">
            <span className="text-white font-semibold">{selected.size}</span> selectionnee{selected.size > 1 ? "s" : ""}
          </span>
          <div className="flex-1" />
          {selectedStatus === "a_expedier" && (
            <button
              onClick={() => handleBulkStatus("expedie")}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-md hover:bg-rose-400 disabled:opacity-50"
            >
              <Truck size={12} />
              Marquer expedie{selected.size > 1 ? "es" : "e"}
            </button>
          )}
          {selectedStatus === "expedie" && (
            <button
              onClick={() => handleBulkStatus("livre")}
              disabled={isPending}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-md hover:bg-emerald-500/20 disabled:opacity-50"
            >
              <CheckCircle2 size={12} />
              Marquer livre{selected.size > 1 ? "es" : "e"}
            </button>
          )}
          <button onClick={() => setSelected(new Set())} className="p-1.5 rounded-md hover:bg-[var(--color-bg-hover)] text-zinc-500">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Orders list */}
      {filtered.length === 0 ? (
        <div className="card-static p-12 text-center">
          <Package size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm">
            {search ? "Aucune commande trouvee" : `Aucune commande ${activeStatus === "a_expedier" ? "a expedier" : ""}`}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Select all row */}
          {filtered.length > 1 && (selectedStatus === "a_expedier" || selectedStatus === "expedie") && (
            <div className="flex items-center px-4 py-2">
              <input
                type="checkbox"
                checked={selected.size === filtered.length && filtered.length > 0}
                onChange={toggleSelectAll}
                className="w-3.5 h-3.5 rounded border-[var(--color-border)] bg-[var(--color-bg)] text-rose-500 focus:ring-rose-500 focus:ring-1"
              />
              <span className="ml-3 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">
                Tout selectionner ({filtered.length})
              </span>
            </div>
          )}

          {filtered.map((order) => {
            const ss = SHIPPING_STATUS[order.shippingStatus as keyof typeof SHIPPING_STATUS] ?? SHIPPING_STATUS.a_expedier;
            const ShipIcon = ss.icon;
            const isEditingThis = editingTracking === order.id;
            const days = daysSinceSold(order.soldAt);
            const isUrgent = order.shippingStatus === "a_expedier" && days > 3;
            const canBulkSelect = selectedStatus === "a_expedier" || selectedStatus === "expedie";

            return (
              <div key={order.id} className={`card-static overflow-hidden ${isUrgent ? "ring-1 ring-red-500/20" : ""}`}>
                <div className="p-4 flex items-center gap-3">
                  {canBulkSelect && (
                    <input
                      type="checkbox"
                      checked={selected.has(order.id)}
                      onChange={() => toggleSelect(order.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-3.5 h-3.5 rounded border-[var(--color-border)] bg-[var(--color-bg)] text-rose-500 focus:ring-rose-500 focus:ring-1 flex-shrink-0"
                    />
                  )}

                  {/* Status icon */}
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border ${ss.cl}`}>
                    <ShipIcon size={18} />
                  </div>

                  {/* Content - cliquable vers detail */}
                  <Link href={`/orders/${order.id}`} className="flex-1 min-w-0 block group">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[13px] font-medium text-white truncate group-hover:text-rose-400 transition">
                        {order.productTitle ?? "Article"}
                      </p>
                      {order.productBrand && <span className="text-[12px] text-zinc-500">— {order.productBrand}</span>}
                      {isUrgent && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-red-300 bg-red-500/15">
                          <Flame size={9} />
                          {days}j d'attente
                        </span>
                      )}
                      {order.paymentStatus === "en_attente" && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-amber-300 bg-amber-500/15">
                          Paiement en attente
                        </span>
                      )}
                      {order.disputeStatus === "ouvert" && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-red-300 bg-red-500/15">
                          <AlertTriangle size={9} />
                          Litige
                        </span>
                      )}
                      {(() => {
                        if (order.shippingStatus !== "a_expedier") return null;
                        const done = Object.values(order.prepChecklist ?? {}).filter(Boolean).length;
                        if (done === 0) return null;
                        return (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-amber-400 bg-amber-500/10">
                            Prep {done}/6
                          </span>
                        );
                      })()}
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[11px] flex-wrap">
                      <span className="text-zinc-500">{CHANNELS[order.channel] ?? order.channel}</span>
                      <span className="text-zinc-700">·</span>
                      <span className="text-white font-medium tabular-nums">{formatCurrency(order.salePrice)}</span>
                      {order.customerFirstName && (
                        <>
                          <span className="text-zinc-700">·</span>
                          <span className="text-zinc-500">{order.customerFirstName} {order.customerLastName}</span>
                        </>
                      )}
                      <span className="text-zinc-700">·</span>
                      <span className="text-zinc-500">{relativeDate(order.soldAt)}</span>
                    </div>
                    {order.trackingNumber && !isEditingThis && (
                      <div className="flex items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] text-zinc-500">Suivi :</span>
                        <code className="text-[11px] text-emerald-400 font-mono">{order.trackingNumber}</code>
                        <button onClick={(e) => { e.preventDefault(); handleCopy(order.trackingNumber!, order.id); }}
                          className="p-0.5 rounded hover:bg-[var(--color-bg-hover)] text-zinc-500 hover:text-zinc-300 transition">
                          {copied === order.id ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                        </button>
                        <a
                          href={getTrackingUrl(order.trackingNumber)!}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                        >
                          <ExternalLink size={9} />
                          Suivre
                        </a>
                      </div>
                    )}
                  </Link>

                  {/* Actions toujours visibles */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {order.shippingStatus === "a_expedier" && (
                      <button onClick={() => { setEditingTracking(order.id); setTrackingInput(order.trackingNumber ?? ""); }}
                        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-lg hover:bg-rose-400 transition">
                        <Truck size={12} />
                        <span className="hidden sm:inline">Expedier</span>
                      </button>
                    )}
                    {order.shippingStatus === "expedie" && (
                      <button onClick={() => handleShippingChange(order.id, "livre")}
                        title="Marquer livre"
                        className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition">
                        <CheckCircle2 size={12} />
                        <span className="hidden sm:inline sm:ml-1.5">Livre</span>
                      </button>
                    )}
                    {order.paymentStatus === "en_attente" && (
                      <button onClick={() => handlePaymentChange(order.id, "recu")}
                        title="Paiement recu"
                        className="flex items-center justify-center w-8 h-8 sm:w-auto sm:h-auto sm:px-3 sm:py-1.5 text-[11px] font-medium text-zinc-400 bg-[var(--color-bg-hover)] rounded-lg hover:text-emerald-400 transition">
                        <CreditCard size={12} />
                        <span className="hidden lg:inline lg:ml-1.5">Paiement recu</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Tracking input panel */}
                {isEditingThis && (
                  <div className="border-t border-[var(--color-border)] p-3 bg-[var(--color-bg)]/30 flex items-center gap-2 flex-wrap">
                    <Truck size={15} className="text-zinc-500 flex-shrink-0" />
                    <input type="text" placeholder="Numero de suivi (optionnel)" value={trackingInput}
                      onChange={(e) => setTrackingInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleTrackingSave(order.id)}
                      className="flex-1 min-w-[180px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-[13px] text-white placeholder:text-zinc-500 focus:outline-none focus:ring-1 focus:ring-rose-500/50 font-mono"
                      autoFocus />
                    <button onClick={() => handleTrackingSave(order.id)} disabled={isPending}
                      className="px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-lg hover:bg-rose-400 transition disabled:opacity-50">
                      {isPending ? "..." : "Confirmer"}
                    </button>
                    <button onClick={() => setEditingTracking(null)} className="p-1.5 text-zinc-500 hover:text-zinc-300">
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
