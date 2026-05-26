"use client";

import { useState, useMemo, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, ShoppingCart, ArrowUpDown, ChevronDown, X, Trash2,
  CreditCard, Truck, CheckCircle2, Package, AlertTriangle,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { bulkDeleteSalesAction } from "@/lib/actions/sales";

type Sale = {
  id: string;
  channel: string;
  salePrice: string;
  netRevenue: string | null;
  margin: string | null;
  marginPct: string | null;
  paymentStatus: string | null;
  shippingStatus: string | null;
  soldAt: Date | null;
  notes: string | null;
  productTitle: string | null;
  productBrand: string | null;
  productSku: string | null;
  customerName: string | null;
};

const PERIODS = [
  { key: "all", label: "Tout" },
  { key: "year", label: "Annee" },
  { key: "month", label: "Mois" },
  { key: "week", label: "Semaine" },
];

const CHANNELS = [
  { value: "all", label: "Tous canaux" },
  { value: "vinted", label: "Vinted" },
  { value: "vestiaire", label: "Vestiaire" },
  { value: "stockx", label: "StockX" },
  { value: "prive", label: "Prive" },
  { value: "autre", label: "Autre" },
];

const SORT_OPTIONS = [
  { value: "recent", label: "Plus recent" },
  { value: "oldest", label: "Plus ancien" },
  { value: "price_desc", label: "Prix decroissant" },
  { value: "price_asc", label: "Prix croissant" },
  { value: "margin_desc", label: "Marge decroissante" },
];

const CHANNEL_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  vinted: { bg: "bg-teal-500/10 border-teal-500/20", text: "text-teal-400", dot: "bg-teal-400" },
  vestiaire: { bg: "bg-amber-500/10 border-amber-500/20", text: "text-amber-400", dot: "bg-amber-400" },
  stockx: { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-400" },
  prive: { bg: "bg-rose-500/10 border-rose-500/20", text: "text-rose-400", dot: "bg-rose-400" },
  autre: { bg: "bg-zinc-500/10 border-zinc-500/20", text: "text-zinc-400", dot: "bg-zinc-400" },
};
const CHANNEL_LABELS: Record<string, string> = {
  vinted: "Vinted", vestiaire: "Vestiaire", stockx: "StockX", prive: "Prive", autre: "Autre",
};

function ChannelBadge({ channel }: { channel: string }) {
  const s = CHANNEL_STYLES[channel] ?? CHANNEL_STYLES.autre;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${s.dot}`} />
      {CHANNEL_LABELS[channel] ?? channel}
    </span>
  );
}

function PaymentBadge({ status }: { status: string | null }) {
  if (!status) return null;
  if (status === "recu") return null;
  const config: Record<string, { label: string; cl: string; icon: any }> = {
    en_attente: { label: "Paiement en attente", cl: "text-amber-400 bg-amber-500/10", icon: AlertTriangle },
    rembourse: { label: "Rembourse", cl: "text-red-400 bg-red-500/10", icon: X },
  };
  const c = config[status];
  if (!c) return null;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${c.cl}`}>
      <Icon size={9} />
      {c.label}
    </span>
  );
}

function ShippingBadge({ status }: { status: string | null }) {
  if (!status || status === "livre") return null;
  const config: Record<string, { label: string; cl: string; icon: any }> = {
    a_expedier: { label: "A expedier", cl: "text-amber-400 bg-amber-500/10", icon: Package },
    expedie: { label: "Expedie", cl: "text-emerald-400 bg-emerald-500/10", icon: Truck },
    retourne: { label: "Retourne", cl: "text-red-400 bg-red-500/10", icon: X },
  };
  const c = config[status];
  if (!c) return null;
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${c.cl}`}>
      <Icon size={9} />
      {c.label}
    </span>
  );
}

export default function SalesListClient({
  sales,
  currentPeriod,
}: {
  sales: Sale[];
  currentPeriod: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState("all");
  const [sort, setSort] = useState("recent");
  const [showSort, setShowSort] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    let list = sales.filter((s) => {
      const matchSearch =
        search === "" ||
        s.productTitle?.toLowerCase().includes(search.toLowerCase()) ||
        s.productBrand?.toLowerCase().includes(search.toLowerCase()) ||
        s.productSku?.toLowerCase().includes(search.toLowerCase()) ||
        s.customerName?.toLowerCase().includes(search.toLowerCase()) ||
        s.notes?.toLowerCase().includes(search.toLowerCase());
      const matchChannel = channelFilter === "all" || s.channel === channelFilter;
      return matchSearch && matchChannel;
    });

    list = [...list];
    switch (sort) {
      case "oldest":
        list.sort((a, b) => new Date(a.soldAt!).getTime() - new Date(b.soldAt!).getTime());
        break;
      case "price_desc":
        list.sort((a, b) => Number(b.salePrice) - Number(a.salePrice));
        break;
      case "price_asc":
        list.sort((a, b) => Number(a.salePrice) - Number(b.salePrice));
        break;
      case "margin_desc":
        list.sort((a, b) => Number(b.margin ?? 0) - Number(a.margin ?? 0));
        break;
      case "recent":
      default:
        list.sort((a, b) => new Date(b.soldAt!).getTime() - new Date(a.soldAt!).getTime());
    }
    return list;
  }, [sales, search, channelFilter, sort]);

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
    else setSelected(new Set(filtered.map((s) => s.id)));
  }

  function handleBulkDelete() {
    if (!confirm(`Supprimer ${selected.size} vente${selected.size > 1 ? "s" : ""} ? Action irreversible.`)) return;
    startTransition(async () => {
      await bulkDeleteSalesAction(Array.from(selected));
      setSelected(new Set());
      router.refresh();
    });
  }

  const hasSelection = selected.size > 0;

  return (
    <>
      {/* Period tabs */}
      <div className="flex bg-zinc-800/60 rounded-lg p-0.5 w-fit">
        {PERIODS.map(({ key, label }) => (
          <Link
            key={key}
            href={key === "all" ? "/sales" : `/sales?period=${key}`}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${
              currentPeriod === key
                ? "bg-[var(--color-accent-muted)] text-rose-400"
                : "text-zinc-500 hover:text-zinc-300"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Rechercher (article, marque, SKU, client, notes)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-[13px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-1 focus:ring-rose-500/50 focus:border-rose-500/50 text-zinc-200 placeholder:text-zinc-500"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="text-[13px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-rose-500/50 text-zinc-300"
          >
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>

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
                    <button
                      key={opt.value}
                      onClick={() => { setSort(opt.value); setShowSort(false); }}
                      className={`w-full px-3 py-1.5 text-left text-[13px] hover:bg-[var(--color-bg-hover)] transition ${sort === opt.value ? "text-rose-400 font-medium" : "text-zinc-300"}`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bulk actions */}
      {hasSelection && (
        <div className="card-static p-3 flex items-center gap-3">
          <span className="text-[12px] text-zinc-400">
            <span className="text-white font-semibold">{selected.size}</span> selectionnee{selected.size > 1 ? "s" : ""}
          </span>
          <div className="flex-1" />
          <button
            onClick={handleBulkDelete}
            disabled={isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium bg-red-500/10 text-red-400 rounded-md hover:bg-red-500/20 disabled:opacity-50"
          >
            <Trash2 size={12} />
            Supprimer
          </button>
          <button onClick={() => setSelected(new Set())} className="p-1.5 rounded-md hover:bg-[var(--color-bg-hover)] text-zinc-500">
            <X size={14} />
          </button>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <div className="card-static p-12 text-center">
          <ShoppingCart size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 text-sm">
            {search || channelFilter !== "all" ? "Aucune vente trouvee" : "Aucune vente"}
          </p>
        </div>
      ) : (
        <div className="card-static overflow-hidden">
          <div className="flex items-center px-5 py-2.5 border-b border-[var(--color-border)] bg-[var(--color-bg)]/30">
            <input
              type="checkbox"
              checked={selected.size === filtered.length && filtered.length > 0}
              onChange={toggleSelectAll}
              className="w-3.5 h-3.5 rounded border-[var(--color-border)] bg-[var(--color-bg)] text-rose-500 focus:ring-rose-500 focus:ring-1"
            />
            <span className="ml-3 text-[11px] text-zinc-500 uppercase tracking-wider font-semibold">
              {filtered.length} resultat{filtered.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {filtered.map((sale) => (
              <div key={sale.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--color-bg-hover)] transition-colors group">
                <input
                  type="checkbox"
                  checked={selected.has(sale.id)}
                  onChange={() => toggleSelect(sale.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-3.5 h-3.5 rounded border-[var(--color-border)] bg-[var(--color-bg)] text-rose-500 focus:ring-rose-500 focus:ring-1 flex-shrink-0"
                />
                <Link href={`/sales/${sale.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-zinc-200 truncate group-hover:text-white">
                      {sale.productTitle ?? sale.notes ?? "Article supprime"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <ChannelBadge channel={sale.channel} />
                      <PaymentBadge status={sale.paymentStatus} />
                      <ShippingBadge status={sale.shippingStatus} />
                      {sale.customerName && (
                        <span className="text-[11px] text-zinc-500">· {sale.customerName}</span>
                      )}
                      <span className="text-[11px] text-zinc-500">· {formatDate(sale.soldAt)}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-[13px] font-medium text-white tabular-nums">{formatCurrency(sale.salePrice)}</p>
                    {sale.margin && (
                      <p className={`text-[11px] tabular-nums ${Number(sale.margin) >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {Number(sale.margin) >= 0 ? "+" : ""}{formatCurrency(sale.margin)}
                      </p>
                    )}
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
