"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
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
  { key: "year", label: "Annee" },
];

function formatEur(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return `${Math.round(value)}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-4 py-3 text-sm shadow-xl border"
      style={{
        background: "var(--color-bg-card)",
        borderColor: "var(--color-border-accent)",
        backdropFilter: "blur(8px)",
      }}
    >
      <p style={{ color: "var(--color-text-muted)" }} className="text-[11px] mb-0.5">{label}</p>
      <p style={{ color: "var(--color-text)" }} className="font-bold text-[15px] tabular-nums">
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
          <h2 className="section-title">Chiffre d'affaires</h2>
          <p className="text-xl lg:text-2xl font-bold text-white tabular-nums mt-1">
            {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(total)}
          </p>
        </div>
        <div className="flex bg-zinc-800/60 rounded-lg p-0.5 self-start sm:self-auto">
          {PERIOD_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all duration-200 ${
                period === key
                  ? "bg-[rgba(251,113,133,0.12)] text-rose-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="h-[200px] lg:h-[280px] px-2">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap="20%">
              <defs>
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent)" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.5} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} interval={period === "day" ? 3 : period === "month" ? 4 : 0} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} tickFormatter={formatEur} width={50} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--color-bg-hover)", radius: 6 }} />
              <Bar dataKey="revenue" fill="url(#barGradient)" radius={[6, 6, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
