"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart3, TrendingUp, AlertTriangle, FileSpreadsheet, Percent, ShoppingCart, Wallet, Zap, Trophy, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line } from "recharts";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { CHANNELS, CATEGORIES } from "@/lib/data";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-zinc-400 mb-0.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-semibold text-white tabular-nums">
          {typeof p.value === "number" && p.value > 10 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Avr", "Mai", "Juin", "Juil", "Aout", "Sept", "Oct", "Nov", "Dec"];

export default function AnalyticsClient({ initialData }: { initialData: any }) {
  const [data, setData] = useState<any>(initialData);
  const [period, setPeriod] = useState("all");

  useEffect(() => {
    if (period === "all") { setData(initialData); return; }
    fetch(`/api/analytics?period=${period}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {});
  }, [period, initialData]);

  if (!data || data.error) return (
    <div className="space-y-6 page-enter">
      <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Analytique</h1>
      <div className="card-static p-12 text-center">
        <p className="text-zinc-500">Pas assez de donnees pour afficher les analytics.</p>
      </div>
    </div>
  );

  // Build seasonality data (12 months current year)
  const currentYear = new Date().getFullYear();
  const monthlyData = MONTH_NAMES.map((name, i) => {
    const entry = (data.seasonality ?? []).find((s: any) => s.year === currentYear && s.month === i + 1);
    return { name, revenue: entry?.revenue ?? 0, margin: entry?.margin ?? 0 };
  });

  return (
    <div className="space-y-6 page-enter">
      <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-white tracking-tight">Analytique</h1>
          <p className="text-zinc-500 mt-1 text-sm">Performance, tendances et points d'attention</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-800/60 rounded-lg p-0.5">
            {([
              { key: "30d", label: "30j" },
              { key: "90d", label: "90j" },
              { key: "year", label: "Annee" },
              { key: "all", label: "Tout" },
            ] as const).map((f) => (
              <button
                key={f.key}
                onClick={() => setPeriod(f.key)}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${
                  period === f.key
                    ? "bg-[var(--color-accent-muted)] text-rose-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <a
            href="/api/analytics/excel"
            className="flex items-center gap-2 px-3 sm:px-4 py-2 text-[13px] font-medium text-zinc-400 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:text-zinc-200 transition-colors"
            title="Export Excel/CSV"
          >
            <FileSpreadsheet size={14} />
            <span className="hidden sm:inline">Excel</span>
          </a>
        </div>
      </div>

      {/* Quick links vers les sous-pages analytics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link href="/analytics/velocity" className="block card-static p-4 hover:border-[var(--color-border-hover)] transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
              <Zap size={16} className="text-emerald-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white">Vitesse de vente</p>
              <p className="text-[11px] text-zinc-500 mt-0.5 truncate">Combien de jours par marque, categorie, canal</p>
            </div>
            <ChevronRight size={14} className="text-zinc-500 group-hover:text-zinc-400 transition-colors" />
          </div>
        </Link>
        <Link href="/analytics/best-sellers" className="block card-static p-4 hover:border-[var(--color-border-hover)] transition-all group">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center flex-shrink-0">
              <Trophy size={16} className="text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-white">Best sellers</p>
              <p className="text-[11px] text-zinc-500 mt-0.5 truncate">Top marques, categories et produits par rotation</p>
            </div>
            <ChevronRight size={14} className="text-zinc-500 group-hover:text-zinc-400 transition-colors" />
          </div>
        </Link>
      </div>

      {/* Month comparison KPIs - 4 */}
      {data.comparison && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">CA ce mois</p>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><ShoppingCart size={15} className="text-emerald-400" /></div>
            </div>
            <div className="mt-auto">
              <p className="text-[22px] font-bold tabular-nums text-white">{formatCurrency(data.comparison.currentRevenue)}</p>
              {data.comparison.previousRevenue > 0 && (
                <p className={`text-[11px] font-medium mt-0.5 ${data.comparison.revenueChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {data.comparison.revenueChange >= 0 ? "+" : ""}{data.comparison.revenueChange.toFixed(1)}% vs m. dernier
                </p>
              )}
            </div>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Marge ce mois</p>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Wallet size={15} className="text-emerald-400" /></div>
            </div>
            <div className="mt-auto">
              <p className="text-[22px] font-bold tabular-nums text-emerald-400">{formatCurrency(data.comparison.currentMargin)}</p>
              {data.comparison.previousMargin > 0 && (
                <p className={`text-[11px] font-medium mt-0.5 ${data.comparison.marginChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {data.comparison.marginChange >= 0 ? "+" : ""}{data.comparison.marginChange.toFixed(1)}% vs m. dernier
                </p>
              )}
            </div>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Marge moyenne</p>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Percent size={15} className="text-emerald-400" /></div>
            </div>
            <p className="text-[22px] font-bold tabular-nums text-white mt-auto">{formatPercent(data.comparison.currentMarginPct ?? 0)}</p>
          </div>
          <div className="kpi-card p-4 flex flex-col justify-between min-h-[110px]">
            <div className="flex items-start justify-between">
              <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">Ventes ce mois</p>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center"><BarChart3 size={15} className="text-rose-400" /></div>
            </div>
            <div className="mt-auto">
              <p className="text-[22px] font-bold tabular-nums text-white">{data.comparison.currentCount}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">vs {data.comparison.previousCount} mois dernier</p>
            </div>
          </div>
        </div>
      )}

      {/* Stock a risque - en haut car critique */}
      {data.atRisk?.length > 0 && (
        <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-xl p-5">
          <h2 className="text-[15px] font-semibold text-amber-300 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} />
            Stock dormant ({data.atRisk.length} article{data.atRisk.length > 1 ? "s" : ""})
          </h2>
          <p className="text-[11px] text-amber-400/70 mb-3">Articles en stock depuis plus de 60 jours</p>
          <div className="divide-y divide-amber-500/10">
            {data.atRisk.map((a: any) => (
              <Link key={a.id} href={`/products/${a.id}`} className="flex items-center justify-between py-2.5 hover:bg-amber-500/[0.04] -mx-2 px-2 rounded-lg transition-colors">
                <div>
                  <p className="text-[13px] text-zinc-200">{a.title}</p>
                  <p className="text-[11px] text-zinc-500">{a.brand}</p>
                </div>
                <div className="text-right">
                  <p className="text-[13px] text-amber-400 font-medium">{a.daysInStock} jours</p>
                  <p className="text-[11px] text-zinc-500">Achat {formatCurrency(a.purchasePrice)}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Saisonnalite - mensuel */}
      {monthlyData.some((m) => m.revenue > 0) && (
        <div className="card-static p-6">
          <h2 className="text-[15px] font-semibold text-white mb-1 flex items-center gap-2">
            <TrendingUp size={16} className="text-rose-400" />
            Evolution mensuelle {currentYear}
          </h2>
          <p className="text-[11px] text-zinc-500 mb-5">CA et marge par mois</p>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#52525b", fontSize: 11 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#52525b", fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
                <Tooltip content={<CustomTooltip />} />
                <Line type="monotone" dataKey="revenue" stroke="#0d6b4e" strokeWidth={2} dot={{ fill: "#0d6b4e", r: 3 }} name="CA" />
                <Line type="monotone" dataKey="margin" stroke="#10b981" strokeWidth={2} dot={{ fill: "#10b981", r: 3 }} name="Marge" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Brand performance table */}
      <div className="card-static p-6">
        <h2 className="text-[15px] font-semibold text-white mb-5 flex items-center gap-2">
          <BarChart3 size={16} className="text-rose-400" />
          Performance par marque
        </h2>
        {data.brandPerf?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {["Marque", "Ventes", "CA", "Marge totale", "Marge moy.", "Vitesse"].map((h, i) => (
                    <th key={h} className={`${i >= 2 ? "text-right" : "text-left"} py-2.5 text-[11px] font-medium text-zinc-500 uppercase tracking-wider px-3`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-border)]">
                {data.brandPerf.map((b: any) => (
                  <tr key={b.brand} className="hover:bg-[var(--color-bg-hover)] transition-colors">
                    <td className="py-3 px-3 text-zinc-200 font-medium">{b.brand}</td>
                    <td className="py-3 px-3 text-zinc-400">{b.count}</td>
                    <td className="py-3 px-3 text-right text-white tabular-nums">{formatCurrency(b.totalRevenue)}</td>
                    <td className="py-3 px-3 text-right text-emerald-400 tabular-nums">{formatCurrency(b.totalMargin)}</td>
                    <td className="py-3 px-3 text-right text-zinc-300 tabular-nums">{formatPercent(b.avgMarginPct)}</td>
                    <td className="py-3 px-3 text-right text-zinc-400">{b.avgVelocity}j</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="text-zinc-500 text-sm">Pas de donnees</p>}
      </div>

      {/* Two columns: Category perf + Channel margin */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-static p-6">
          <h2 className="text-[15px] font-semibold text-white mb-5">Performance par categorie</h2>
          {data.categoryPerf?.length > 0 ? (
            <div className="h-[260px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categoryPerf.map((c: any) => ({ ...c, name: CATEGORIES.find((x) => x.value === c.category)?.label ?? c.category }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#52525b", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#52525b", fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="totalMargin" radius={[4, 4, 0, 0]}>
                    {data.categoryPerf.map((_: any, i: number) => (
                      <Cell key={i} fill={i === 0 ? "#0d6b4e" : i === 1 ? "#0a5840" : "#084632"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-zinc-500 text-sm">Pas de donnees</p>}
        </div>

        <div className="card-static p-6">
          <h2 className="text-[15px] font-semibold text-white mb-5">Marge moyenne par canal</h2>
          {data.channelMargin?.length > 0 ? (
            <div className="space-y-4">
              {data.channelMargin.map((c: any) => {
                const label = CHANNELS.find((x) => x.value === c.channel)?.label ?? c.channel;
                const pct = Math.max(0, Math.min(Math.round(c.avgMarginPct), 100));
                return (
                  <div key={c.channel}>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-sm text-zinc-300">{label}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-zinc-500">{c.count} vente{c.count > 1 ? "s" : ""}</span>
                        <span className="text-sm font-medium text-white tabular-nums">{formatPercent(c.avgMarginPct)}</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-[var(--color-bg-hover)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-rose-500 to-rose-400" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">
                      Marge moy. : {formatCurrency(c.avgMargin)} par vente
                    </p>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-zinc-500 text-sm">Pas de donnees</p>}
        </div>
      </div>

      {/* Top articles */}
      <div className="card-static p-6">
        <h2 className="text-[15px] font-semibold text-white mb-5 flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-400" />
          Meilleures ventes (par marge)
        </h2>
        {data.topArticles?.length > 0 ? (
          <div className="divide-y divide-[var(--color-border)]">
            {data.topArticles.map((a: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-6 h-6 rounded-full bg-[var(--color-bg-hover)] flex items-center justify-center text-[11px] font-semibold text-zinc-400 flex-shrink-0">{i + 1}</span>
                  <div className="min-w-0">
                    <p className="text-[13px] text-zinc-200 truncate">{a.title}</p>
                    <p className="text-[11px] text-zinc-500">{a.brand} · Achat {formatCurrency(a.purchasePrice)}</p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0 ml-3">
                  <p className="text-[13px] font-medium text-white tabular-nums">{formatCurrency(a.salePrice)}</p>
                  <p className={`text-[11px] tabular-nums ${a.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {a.margin >= 0 ? "+" : ""}{formatCurrency(a.margin)} ({formatPercent(a.marginPct)})
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-zinc-500 text-sm">Pas de donnees</p>}
      </div>

      <div className="pb-8" />
    </div>
  );
}
