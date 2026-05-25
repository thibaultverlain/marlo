import { AlertTriangle, Flame, Skull, Lock } from "lucide-react";
import { getAuthContext } from "@/lib/auth/require-role";
import { getDormantProducts, getDormantStats } from "@/lib/db/queries/products";
import { formatCurrency } from "@/lib/utils";
import DormantsList from "@/components/products/dormants/dormants-list";
import { PageHeader } from "@/components/ui/page-header";

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
      <PageHeader
        backHref="/products"
        title="Stock dormant"
        subtitle="Produits en stock depuis plus de 30 jours — agis pour les sortir"
        level="sub"
      />

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <StatCard
          icon={<AlertTriangle size={14} className="text-amber-400" />}
          label="30-60 jours"
          value={stats.bucket30}
          accent="text-amber-400"
        />
        <StatCard
          icon={<Flame size={14} className="text-amber-400" />}
          label="60-90 jours"
          value={stats.bucket60}
          accent="text-amber-400"
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
      {subtitle && <p className="text-[10px] text-zinc-500 mt-1">{subtitle}</p>}
    </div>
  );
}
