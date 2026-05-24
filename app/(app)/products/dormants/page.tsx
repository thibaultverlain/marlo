import Link from "next/link";
import { ArrowLeft, Snowflake, AlertTriangle, Flame, Skull, Lock } from "lucide-react";
import { getAuthContext } from "@/lib/auth/require-role";
import { getDormantProducts, getDormantStats } from "@/lib/db/queries/products";
import { formatCurrency } from "@/lib/utils";
import DormantsList from "@/components/products/dormants/dormants-list";

export const dynamic = "force-dynamic";

export default async function DormantsPage() {
  const ctx = await getAuthContext();
  const [products, stats] = await Promise.all([
    getDormantProducts(ctx.shopId, 30),
    getDormantStats(ctx.shopId),
  ]);

  const lockedPurchase = Number(stats.lockedPurchase ?? 0);
  const lockedTarget = Number(stats.lockedTarget ?? 0);
  const lockedMargin = lockedTarget - lockedPurchase;

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/products"
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">Stock dormant</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Produits en stock depuis plus de 30 jours — agis pour les sortir
          </p>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<AlertTriangle size={14} className="text-yellow-400" />}
          label="30-60 jours"
          value={stats.bucket30}
          accent="text-yellow-400"
        />
        <StatCard
          icon={<Flame size={14} className="text-orange-400" />}
          label="60-90 jours"
          value={stats.bucket60}
          accent="text-orange-400"
        />
        <StatCard
          icon={<Skull size={14} className="text-red-400" />}
          label="90+ jours"
          value={stats.bucket90}
          accent="text-red-400"
        />
        <StatCard
          icon={<Lock size={14} className="text-zinc-500" />}
          label="Cash immobilise"
          value={formatCurrency(lockedPurchase)}
          accent="text-white"
          subtitle={lockedMargin > 0 ? `+${formatCurrency(lockedMargin)} de marge potentielle` : undefined}
        />
      </div>

      {/* Liste */}
      <DormantsList products={products} />
    </div>
  );
}

function StatCard({
  icon, label, value, accent, subtitle,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent: string;
  subtitle?: string;
}) {
  return (
    <div className="card-static p-4">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className={`text-xl font-bold tabular-nums ${accent}`}>{value}</p>
      {subtitle && <p className="text-[10px] text-zinc-600 mt-1">{subtitle}</p>}
    </div>
  );
}
