import Link from "next/link";
import { Zap, Package, Tag, Store, ChevronRight } from "lucide-react";
import { getAuthContext } from "@/lib/auth/require-role";
import {
  getVelocityByBrand,
  getVelocityByCategory,
  getVelocityByChannel,
  getVelocityOverview,
} from "@/lib/db/queries/sales-analytics";
import { formatCurrency } from "@/lib/utils";
import VelocityTable from "@/components/analytics/velocity-table";
import { PageHeader } from "@/components/ui/page-header";

export const dynamic = "force-dynamic";

const PERIODS = [
  { months: 3, label: "3 mois" },
  { months: 6, label: "6 mois" },
  { months: 12, label: "12 mois" },
] as const;

export default async function VelocityPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams;
  const periodMonths = Number(sp.period) || 12;
  const validPeriod = PERIODS.find((p) => p.months === periodMonths) ?? PERIODS[2];

  const { shopId } = await getAuthContext();
  const [overview, brandRows, categoryRows, channelRows] = await Promise.all([
    getVelocityOverview(shopId, validPeriod.months),
    getVelocityByBrand(shopId, validPeriod.months),
    getVelocityByCategory(shopId, validPeriod.months),
    getVelocityByChannel(shopId, validPeriod.months),
  ]);

  const periodSwitcher = (
    <div className="flex bg-zinc-800/60 rounded-lg p-0.5">
      {PERIODS.map((p) => (
        <Link
          key={p.months}
          href={`/analytics/velocity?period=${p.months}`}
          className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${
            p.months === validPeriod.months
              ? "bg-[var(--color-accent-muted)] text-rose-400"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {p.label}
        </Link>
      ))}
    </div>
  );

  return (
    <div className="space-y-6 page-enter">
      <PageHeader
        backHref="/analytics"
        title="Vitesse de vente"
        subtitle="Combien de temps tes articles passent en stock avant d'etre vendus"
        actions={periodSwitcher}
        level="sub"
      />

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        <OverviewCard
          icon={<Package size={14} className="text-rose-400" />}
          label="Ventes totales"
          value={overview.totalSales}
          subtitle={`${overview.matchedSales} avec produit lie`}
        />
        <OverviewCard
          icon={<Zap size={14} className="text-emerald-400" />}
          label="Duree moyenne"
          value={`${overview.avgDaysToSell.toFixed(1)}j`}
          subtitle="Entre achat et vente"
        />
        <OverviewCard
          icon={<Tag size={14} className="text-emerald-400" />}
          label="CA periode"
          value={formatCurrency(overview.totalRevenue)}
        />
        <OverviewCard
          icon={<Store size={14} className="text-amber-400" />}
          label="Periode"
          value={validPeriod.label}
        />
      </div>

      {overview.matchedSales === 0 ? (
        <div className="card-static p-8 text-center">
          <p className="text-[14px] text-zinc-400">
            Aucune vente avec produit lie sur la periode.
          </p>
          <p className="text-[12px] text-zinc-500 mt-2">
            Pour que la vitesse de vente soit calculee, il faut lier les ventes a un produit du stock lors de la saisie.
          </p>
        </div>
      ) : (
        <>
          {/* Par marque */}
          <Section title="Par marque" subtitle="Quelles marques tournent le plus vite chez toi">
            <VelocityTable rows={brandRows} groupBy="brand" />
          </Section>

          {/* Par categorie */}
          <Section title="Par categorie" subtitle="Sacs, chaussures, vetements... quoi privilegier au sourcing">
            <VelocityTable rows={categoryRows} groupBy="category" />
          </Section>

          {/* Par canal */}
          <Section title="Par canal" subtitle="Vinted, Vestiaire, prive... ou ça tourne le mieux">
            <VelocityTable rows={channelRows} groupBy="channel" />
          </Section>
        </>
      )}

      {/* Quick link vers best sellers */}
      <Link
        href="/analytics/best-sellers"
        className="block card-static p-5 hover:border-[var(--color-border-hover)] transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <Tag size={18} className="text-amber-400" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-white">Voir les best sellers</p>
            <p className="text-[12px] text-zinc-500 mt-0.5">Classement des marques et produits qui tournent le mieux</p>
          </div>
          <ChevronRight size={16} className="text-zinc-500 group-hover:text-zinc-400 transition-colors" />
        </div>
      </Link>
    </div>
  );
}

function OverviewCard({ icon, label, value, subtitle }: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtitle?: string;
}) {
  return (
    <div className="card-static p-4">
      <div className="flex items-center gap-1.5 mb-2">
        {icon}
        <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-xl font-bold tabular-nums text-white">{value}</p>
      {subtitle && <p className="text-[10px] text-zinc-500 mt-1">{subtitle}</p>}
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <div>
        <h2 className="text-[15px] font-semibold text-white">{title}</h2>
        {subtitle && <p className="text-[12px] text-zinc-500 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}
