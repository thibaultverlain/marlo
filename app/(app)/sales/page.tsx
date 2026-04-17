import Link from "next/link";
import { Plus, ShoppingCart } from "lucide-react";
import { getAllSales } from "@/lib/db/queries/sales";
import { formatCurrency, formatPercent, formatDate } from "@/lib/utils";
import { CHANNELS } from "@/lib/data";

export const dynamic = "force-dynamic";

function ChannelBadge({ channel }: { channel: string }) {
  const ch = CHANNELS.find((c) => c.value === channel);
  const colors: Record<string, string> = {
    vinted: "bg-teal-50 text-teal-700",
    vestiaire: "bg-orange-50 text-orange-700",
    stockx: "bg-emerald-50 text-emerald-700",
    prive: "bg-amber-50 text-amber-700",
    autre: "bg-stone-100 text-stone-500",
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${colors[channel] || colors.autre}`}>
      {ch?.label ?? channel}
    </span>
  );
}

function PaymentBadge({ status }: { status: string | null }) {
  if (!status) return null;
  if (status === "recu") return <span className="text-[11px] font-medium text-green-600">Payé</span>;
  if (status === "en_attente") return <span className="text-[11px] font-medium text-amber-600">En attente</span>;
  return <span className="text-[11px] font-medium text-red-500">Remboursé</span>;
}

export default async function SalesPage() {
  const sales = await getAllSales();

  const totalRevenue = sales.reduce((s, v) => s + (Number(v.netRevenue) || 0), 0);
  const totalMargin = sales.reduce((s, v) => s + (Number(v.margin) || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl text-stone-900">Ventes</h1>
          <p className="text-stone-400 mt-1">
            {sales.length} ventes · CA {formatCurrency(totalRevenue)} · Marge {formatCurrency(totalMargin)}
          </p>
        </div>
        <Link
          href="/sales/new"
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors"
        >
          <Plus size={16} />
          Enregistrer une vente
        </Link>
      </div>

      {sales.length === 0 ? (
        <div className="bg-white rounded-xl border border-stone-200/60 p-12 text-center">
          <ShoppingCart size={40} className="mx-auto text-stone-300 mb-3" />
          <p className="text-stone-500 mb-4">Aucune vente enregistrée</p>
          <Link
            href="/sales/new"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-stone-900 rounded-lg hover:bg-stone-800 transition-colors"
          >
            <Plus size={14} />
            Enregistrer ma première vente
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-stone-200/60 overflow-hidden">
          <div className="divide-y divide-stone-100">
            {sales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between px-6 py-4 hover:bg-stone-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-stone-800">{sale.productTitle ?? "Article supprimé"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <ChannelBadge channel={sale.channel} />
                      {sale.customerName && <span className="text-xs text-stone-400">{sale.customerName}</span>}
                      <span className="text-xs text-stone-300">{formatDate(sale.soldAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <PaymentBadge status={sale.paymentStatus} />
                  <div className="text-right w-24">
                    <p className="text-sm font-semibold text-stone-900">{formatCurrency(sale.salePrice)}</p>
                    {sale.margin && (
                      <p className="text-xs text-green-600">
                        +{formatCurrency(sale.margin)} ({formatPercent(Number(sale.marginPct))})
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
