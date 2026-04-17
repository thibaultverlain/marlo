import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { getAllSales } from "@/lib/db/queries/sales";
import { formatCurrency, formatPercent, formatDate } from "@/lib/utils";
import { CHANNELS } from "@/lib/data";

export const dynamic = "force-dynamic";

function ChannelBadge({ channel }: { channel: string }) {
  const ch = CHANNELS.find((c) => c.value === channel);
  const colors: Record<string, string> = {
    vinted: "bg-teal-500/10 text-teal-400",
    vestiaire: "bg-orange-500/10 text-orange-400",
    stockx: "bg-emerald-500/10 text-emerald-400",
    prive: "bg-indigo-500/10 text-indigo-400",
    autre: "bg-zinc-500/10 text-zinc-400",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-medium ${colors[channel] || colors.autre}`}>
      {ch?.label ?? channel}
    </span>
  );
}

function PaymentBadge({ status }: { status: string | null }) {
  if (!status) return null;
  if (status === "recu") return <span className="text-[11px] font-medium text-emerald-400">Payé</span>;
  if (status === "en_attente") return <span className="text-[11px] font-medium text-amber-400">En attente</span>;
  return <span className="text-[11px] font-medium text-red-400">Remboursé</span>;
}

export default async function SalesPage() {
  const sales = await getAllSales();
  const totalRevenue = sales.reduce((s, v) => s + (Number(v.netRevenue) || 0), 0);
  const totalMargin = sales.reduce((s, v) => s + (Number(v.margin) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-white">Ventes</h1>
          <p className="text-zinc-500 mt-1 text-sm">
            {sales.length} ventes · CA {formatCurrency(totalRevenue)} · Marge {formatCurrency(totalMargin)}
          </p>
        </div>
        <Link
          href="/sales/new"
          className="flex items-center gap-2 px-4 py-2 text-[13px] font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
        >
          <Plus size={14} />
          Enregistrer une vente
        </Link>
      </div>

      {sales.length === 0 ? (
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-12 text-center">
          <ShoppingCart size={40} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-zinc-500 mb-4 text-sm">Aucune vente enregistrée</p>
          <Link
            href="/sales/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors"
          >
            <Plus size={14} />
            Enregistrer ma première vente
          </Link>
        </div>
      ) : (
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="divide-y divide-[var(--color-border)]">
            {sales.map((sale) => (
              <Link key={sale.id} href={`/sales/${sale.id}`} className="flex items-center justify-between px-5 py-3.5 hover:bg-[var(--color-bg-hover)] transition-colors">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-[13px] font-medium text-zinc-200">{sale.productTitle ?? "Article supprimé"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <ChannelBadge channel={sale.channel} />
                      {sale.customerName && <span className="text-[11px] text-zinc-500">{sale.customerName}</span>}
                      <span className="text-[11px] text-zinc-600">{formatDate(sale.soldAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <PaymentBadge status={sale.paymentStatus} />
                  <div className="text-right w-24">
                    <p className="text-[13px] font-medium text-white tabular-nums">{formatCurrency(sale.salePrice)}</p>
                    {sale.margin && (
                      <p className="text-[11px] text-emerald-400 tabular-nums">
                        +{formatCurrency(sale.margin)} ({formatPercent(Number(sale.marginPct))})
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
