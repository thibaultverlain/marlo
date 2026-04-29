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
    <div className="rounded-xl px-4 py-3 text-sm shadow-xl" style={{ background: "rgba(18, 18, 26, 0.95)", backdropFilter: "blur(8px)", border: "1px solid rgba(56, 189, 248, 0.15)" }}>
      <p className="text-zinc-500 text-[11px] mb-0.5">{label}</p>
      <p className="text-white font-bold text-[15px] tabular-nums">
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
    <div className="chart-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 pt-5 pb-3">
        <div>
          <h2 className="section-title">Vue d'ensemble</h2>
          <p className="text-xl lg:text-2xl font-bold text-white tabular-nums mt-1">
            {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(total)}
          </p>
        </div>

        <div className="flex bg-white/[0.03] rounded-lg p-0.5 self-start sm:self-auto">
          {PERIOD_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all duration-200 ${
                period === key
                  ? "bg-[rgba(56,189,248,0.12)] text-cyan-400"
                  : "text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-[200px] lg:h-[280px]">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.25} />
                  <stop offset="40%" stopColor="#38bdf8" stopOpacity={0.08} />
                  <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.03)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#484855", fontSize: 11 }}
                interval={period === "day" ? 3 : period === "month" ? 4 : 0}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#484855", fontSize: 11 }}
                tickFormatter={formatEur}
                width={55}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(56,189,248,0.15)", strokeWidth: 1 }} />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="#38bdf8"
                strokeWidth={2.5}
                fill="url(#revenueGradient)"
                dot={false}
                activeDot={{
                  r: 5,
                  fill: "#38bdf8",
                  stroke: "#0a0a0f",
                  strokeWidth: 3,
                }}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
