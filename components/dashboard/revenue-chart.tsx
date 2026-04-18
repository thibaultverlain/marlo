"use client";

import { useState, useEffect } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type DataPoint = { label: string; revenue: number };
type Period = "year" | "month" | "week" | "day";

const PERIOD_LABELS: { key: Period; label: string }[] = [
  { key: "day", label: "Jour" },
  { key: "week", label: "Semaine" },
  { key: "month", label: "Mois" },
  { key: "year", label: "Année" },
];

function formatEur(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k €`;
  return `${Math.round(value)} €`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[11px] text-zinc-400 mb-0.5">{label}</p>
      <p className="text-sm font-semibold text-white tabular-nums">
        {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(payload[0].value)}
      </p>
    </div>
  );
}

export default function RevenueChart() {
  const [period, setPeriod] = useState<Period>("month");
  const [data, setData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard/chart?period=${period}`)
      .then((r) => r.json())
      .then((json) => {
        setData(json.data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [period]);

  const total = data.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-[15px] font-semibold text-white">Chiffre d'affaires</h2>
          <p className="text-2xl font-bold text-white tabular-nums mt-1">
            {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(total)}
          </p>
        </div>

        {/* Period tabs */}
        <div className="flex bg-zinc-800/60 rounded-lg p-0.5">
          {PERIOD_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${
                period === key
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[280px]">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#818cf8" stopOpacity={0.3} />
                  <stop offset="50%" stopColor="#818cf8" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#52525b", fontSize: 11 }}
                interval={period === "day" ? 3 : period === "month" ? 4 : 0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#52525b", fontSize: 11 }}
                tickFormatter={formatEur}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(129,140,248,0.2)", strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#818cf8"
                strokeWidth={2}
                fill="url(#revenueGradient)"
                dot={false}
                activeDot={{
                  r: 4,
                  fill: "#818cf8",
                  stroke: "#1e1b4b",
                  strokeWidth: 2,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
