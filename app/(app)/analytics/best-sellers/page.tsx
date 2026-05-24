import Link from "next/link";
import { ArrowLeft, Trophy, Zap, ChevronRight } from "lucide-react";
import { getAuthContext } from "@/lib/auth/require-role";
import {
  getBestSellersByBrand,
  getBestSellersByCategory,
  getTopFastestProducts,
} from "@/lib/db/queries/sales-analytics";
import BestSellersTable from "@/components/analytics/best-sellers-table";
import TopProductsList from "@/components/analytics/top-products-list";

export const dynamic = "force-dynamic";

const PERIODS = [
  { months: 3, label: "3 mois" },
  { months: 6, label: "6 mois" },
  { months: 12, label: "12 mois" },
] as const;

export default async function BestSellersPage({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const sp = await searchParams;
  const periodMonths = Number(sp.period) || 12;
  const validPeriod = PERIODS.find((p) => p.months === periodMonths) ?? PERIODS[2];

  const { shopId } = await getAuthContext();
  const [byBrand, byCategory, topProducts] = await Promise.all([
    getBestSellersByBrand(shopId, validPeriod.months),
    getBestSellersByCategory(shopId, validPeriod.months),
    getTopFastestProducts(shopId, validPeriod.months, 20),
  ]);

  return (
    <div className="space-y-6 page-enter">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/analytics"
          className="w-9 h-9 flex items-center justify-center rounded-lg border border-[var(--color-border)] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white tracking-tight">Best sellers</h1>
          <p className="text-[13px] text-zinc-500 mt-0.5">
            Ce qui tourne le mieux — pour decider ou mettre ton budget de sourcing
          </p>
        </div>

        <div className="flex bg-zinc-800/60 rounded-lg p-0.5">
          {PERIODS.map((p) => (
            <Link
              key={p.months}
              href={`/analytics/best-sellers?period=${p.months}`}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${
                p.months === validPeriod.months
                  ? "bg-[rgba(225,29,72,0.12)] text-rose-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      {byBrand.length === 0 && topProducts.length === 0 ? (
        <div className="card-static p-12 text-center">
          <Trophy size={36} className="mx-auto text-zinc-700 mb-3" />
          <p className="text-[14px] text-zinc-400">Pas encore assez de ventes lieés a un produit du stock.</p>
          <p className="text-[12px] text-zinc-500 mt-2">Pense a lier tes ventes a un produit quand tu les saisis.</p>
        </div>
      ) : (
        <>
          {/* Best sellers par marque */}
          <Section
            title="Top marques par rotation"
            subtitle="Classement par score rotation (CA / duree moyenne de vente)"
          >
            <BestSellersTable rows={byBrand} groupBy="brand" />
          </Section>

          {/* Best sellers par categorie */}
          <Section
            title="Top categories par rotation"
            subtitle="Quelle categorie tourne le mieux chez toi"
          >
            <BestSellersTable rows={byCategory} groupBy="category" />
          </Section>

          {/* Top produits individuels */}
          <Section
            title="Tes ventes les plus rapides"
            subtitle="Top 20 des produits qui sont partis le plus vite — utile pour identifier les types d'articles a racheter"
          >
            <TopProductsList products={topProducts} />
          </Section>
        </>
      )}

      {/* Link retour vers velocity */}
      <Link
        href="/analytics/velocity"
        className="block card-static p-5 hover:border-[var(--color-border-hover)] transition-all group"
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Zap size={18} className="text-emerald-400" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-white">Voir la vitesse de vente</p>
            <p className="text-[12px] text-zinc-500 mt-0.5">Detail par marque, categorie et canal</p>
          </div>
          <ChevronRight size={16} className="text-zinc-600 group-hover:text-zinc-400 transition-colors" />
        </div>
      </Link>
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
