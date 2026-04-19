"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { BarChart3, TrendingUp, Zap, AlertTriangle, Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { CHANNELS, CATEGORIES } from "@/lib/data";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-zinc-400 mb-0.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-sm font-semibold text-white tabular-nums">
          {typeof p.value === "number" && p.value > 10 ? formatCurrency(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/analytics")
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!data || data.error) return (
    <div className="space-y-6">
      <h1 className="text-3xl text-white">Analytique</h1>
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-12 text-center">
        <p className="text-zinc-500">Pas assez de données pour afficher les analytics.</p>
      </div>
    </div>
  );

  const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Jun", "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl text-white">Analytique</h1>
        <p className="text-zinc-500 mt-1 text-sm">Performance, vélocité et prédictions</p>
      </div>

      {/* Brand performance table */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6">
        <h2 className="text-[15px] font-semibold text-white mb-5 flex items-center gap-2">
          <BarChart3 size={16} className="text-indigo-400" />
          Performance par marque
        </h2>
        {data.brandPerf?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  {["Marque", "Ventes", "CA", "Marge totale", "Marge moy.", "Vélocité"].map((h, i) => (
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
        ) : <p className="text-zinc-600 text-sm">Pas de données</p>}
      </div>

      {/* Two columns: Category perf + Channel margin */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category performance */}
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6">
          <h2 className="text-[15px] font-semibold text-white mb-5">Performance par catégorie</h2>
          {data.categoryPerf?.length > 0 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.categoryPerf.map((c: any) => ({ ...c, name: CATEGORIES.find((x) => x.value === c.category)?.label ?? c.category }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#52525b", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#52525b", fontSize: 11 }} tickFormatter={(v) => `${v}€`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="totalMargin" radius={[4, 4, 0, 0]}>
                    {data.categoryPerf.map((_: any, i: number) => (
                      <Cell key={i} fill={i === 0 ? "#818cf8" : i === 1 ? "#6366f1" : "#4f46e5"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : <p className="text-zinc-600 text-sm">Pas de données</p>}
        </div>

        {/* Channel margin prediction */}
        <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6">
          <h2 className="text-[15px] font-semibold text-white mb-5 flex items-center gap-2">
            <Zap size={16} className="text-amber-400" />
            Prédiction de marge par canal
          </h2>
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
                        <span className="text-[11px] text-zinc-600">{c.count} vente{c.count > 1 ? "s" : ""}</span>
                        <span className="text-sm font-medium text-white tabular-nums">{formatPercent(c.avgMarginPct)}</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style={{ width: `${pct}%` }} />
                    </div>
                    <p className="text-[10px] text-zinc-600 mt-1">
                      Marge moy. attendue : {formatCurrency(c.avgMargin)} par vente
                    </p>
                  </div>
                );
              })}
            </div>
          ) : <p className="text-zinc-600 text-sm">Pas de données</p>}
        </div>
      </div>

      {/* Top articles */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6">
        <h2 className="text-[15px] font-semibold text-white mb-5 flex items-center gap-2">
          <TrendingUp size={16} className="text-emerald-400" />
          Meilleures ventes (par marge)
        </h2>
        {data.topArticles?.length > 0 ? (
          <div className="divide-y divide-[var(--color-border)]">
            {data.topArticles.map((a: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-[11px] font-semibold text-zinc-400">{i + 1}</span>
                  <div>
                    <p className="text-[13px] text-zinc-200">{a.title}</p>
                    <p className="text-[11px] text-zinc-500">{a.brand} · Achat {formatCurrency(a.purchasePrice)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[13px] font-medium text-white tabular-nums">{formatCurrency(a.salePrice)}</p>
                  <p className={`text-[11px] tabular-nums ${a.margin >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    {a.margin >= 0 ? "+" : ""}{formatCurrency(a.margin)} ({formatPercent(a.marginPct)})
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-zinc-600 text-sm">Pas de données</p>}
      </div>

      {/* Velocity by brand */}
      <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6">
        <h2 className="text-[15px] font-semibold text-white mb-2">Vélocité par marque</h2>
        <p className="text-[11px] text-zinc-500 mb-5">Nombre moyen de jours entre l'achat et la vente</p>
        {data.velocity?.length > 0 ? (
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.velocity} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: "#52525b", fontSize: 11 }} tickFormatter={(v) => `${v}j`} />
                <YAxis type="category" dataKey="brand" axisLine={false} tickLine={false} tick={{ fill: "#a1a1aa", fontSize: 11 }} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="avgDays" fill="#818cf8" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <p className="text-zinc-600 text-sm">Pas de données</p>}
      </div>

      {/* Stock at risk */}
      {data.atRisk?.length > 0 && (
        <div className="bg-amber-500/[0.06] border border-amber-500/20 rounded-xl p-6">
          <h2 className="text-[15px] font-semibold text-amber-300 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} />
            Stock à risque ({data.atRisk.length} article{data.atRisk.length > 1 ? "s" : ""})
          </h2>
          <div className="divide-y divide-amber-500/10">
            {data.atRisk.map((a: any) => (
              <Link key={a.id} href={`/products/${a.id}`} className="flex items-center justify-between py-3 hover:bg-amber-500/[0.04] -mx-2 px-2 rounded-lg transition-colors">
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

      <div className="pb-8" />
    </div>
  );
}
