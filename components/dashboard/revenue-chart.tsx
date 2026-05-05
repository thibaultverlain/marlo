"use client";

import { useState, useEffect } from "react";
import { Calendar } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type DataPoint = { label: string; revenue: number };
type Period = "year" | "month" | "week" | "day" | "custom";

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
    <div className="rounded-xl px-4 py-3 text-sm shadow-xl border"
      style={{ background: "var(--color-bg-card)", borderColor: "var(--color-border-accent)", backdropFilter: "blur(8px)" }}>
      <p style={{ color: "var(--color-text-muted)" }} className="text-[11px] mb-0.5">{label}</p>
      <p style={{ color: "var(--color-text)" }} className="font-bold text-[15px] tabular-nums">
        {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(payload[0].value)}
      </p>
    </div>
  );
}

function formatDateRange(from: string, to: string): string {
  const f = new Date(from);
  const t = new Date(to);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (f.getFullYear() !== t.getFullYear()) {
    return `${f.toLocaleDateString("fr-FR", { ...opts, year: "numeric" })} - ${t.toLocaleDateString("fr-FR", { ...opts, year: "numeric" })}`;
  }
  return `${f.toLocaleDateString("fr-FR", opts)} - ${t.toLocaleDateString("fr-FR", opts)}`;
}

export default function RevenueChart({ initialData }: { initialData?: DataPoint[] }) {
  const [period, setPeriod] = useState<Period>("month");
  const [data, setData] = useState<DataPoint[]>(initialData ?? []);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (period === "month" && initialData) { setData(initialData); return; }
    if (period === "custom") return;
    setLoading(true);
    fetch(`/api/dashboard/chart?period=${period}`)
      .then((r) => r.json())
      .then((json) => { setData(json.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [period, initialData]);

  function handleCustomDateSearch() {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    setShowDatePicker(false);
    fetch(`/api/dashboard/chart?period=custom&from=${dateFrom}&to=${dateTo}`)
      .then((r) => r.json())
      .then((json) => { setData(json.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }

  const total = data.reduce((s, d) => s + d.revenue, 0);

  return (
    <div className="chart-container">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 pt-5 pb-3">
        <div>
          <h2 className="section-title">Chiffre d'affaires</h2>
          <p className="text-xl lg:text-2xl font-bold text-white tabular-nums mt-1">
            {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(total)}
          </p>
          {period === "custom" && dateFrom && dateTo && (
            <p className="text-[11px] text-zinc-500 mt-0.5">{formatDateRange(dateFrom, dateTo)}</p>
          )}
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex bg-zinc-800/60 rounded-lg p-0.5">
            {PERIOD_LABELS.map(({ key, label }) => (
              <button key={key} onClick={() => { setPeriod(key); setShowDatePicker(false); }}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all duration-200 ${
                  period === key ? "bg-[rgba(251,113,133,0.12)] text-rose-400" : "text-zinc-500 hover:text-zinc-300"
                }`}>{label}</button>
            ))}
          </div>
          <div className="relative">
            <button onClick={() => { setShowDatePicker(!showDatePicker); if (!showDatePicker) setPeriod("custom"); }}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                period === "custom" ? "bg-rose-500/10 text-rose-400" : "text-zinc-600 hover:text-zinc-300 hover:bg-white/[0.03]"
              }`} title="Date personnalisee">
              <Calendar size={15} />
            </button>
            {showDatePicker && (
              <div className="absolute right-0 top-full mt-2 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-xl shadow-black/30 p-4 z-50 w-[280px]">
                <p className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider mb-3">Periode personnalisee</p>
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] text-zinc-500 block mb-1">Du</label>
                    <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]" />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-500 block mb-1">Au</label>
                    <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                      className="w-full bg-[var(--color-bg)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]" />
                  </div>
                  <button onClick={handleCustomDateSearch} disabled={!dateFrom || !dateTo}
                    className="w-full mt-2 px-4 py-2 text-[13px] font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-lg hover:bg-rose-400 transition disabled:opacity-50">
                    Afficher
                  </button>
                </div>
              </div>
            )}
          </div>
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
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "var(--color-text-muted)", fontSize: 11 }}
                interval={data.length > 15 ? Math.floor(data.length / 8) : 0} />
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
