"use client";

import { useState, useEffect } from "react";
import { Calendar, ShoppingCart } from "lucide-react";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import CalendarPicker from "./calendar-picker";
import { formatCurrency } from "@/lib/utils";

type DataPoint = {
  label: string;
  fullLabel?: string;
  revenue: number;
  count: number;
};

type Period = "year" | "month" | "week" | "day" | "custom";

const PERIOD_LABELS: { key: Period; label: string }[] = [
  { key: "day", label: "Jour" },
  { key: "week", label: "Semaine" },
  { key: "month", label: "Mois" },
  { key: "year", label: "Annee" },
];

// Format compact pour l'axe Y (sans symbole, sans arrondi parasite).
// On garde 1 decimale si la valeur a des centimes significatifs, 0 sinon.
function formatYAxis(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value < 10000 ? 1 : 0)}k`;
  // Pas de Math.round : si recharts donne un tick = 21.5, on affiche "21,5"
  // (pas "22" qui creerait un mismatch avec le total du header)
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2).replace(".", ",").replace(/,?0+$/, "");
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload as DataPoint;
  return (
    <div
      className="rounded-xl px-4 py-3 shadow-2xl border min-w-[180px]"
      style={{
        background: "var(--color-bg-card)",
        borderColor: "var(--color-border-accent)",
        backdropFilter: "blur(12px)",
      }}
    >
      <p className="text-[11px] text-zinc-500 mb-2 font-medium">{p.fullLabel ?? p.label}</p>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider">CA</span>
        <span className="font-bold text-[15px] text-white tabular-nums">{formatCurrency(p.revenue)}</span>
      </div>
      {p.count > 0 && (
        <div className="flex items-baseline justify-between gap-3 mt-1.5">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Ventes</span>
          <span className="text-[12px] text-zinc-300 tabular-nums font-medium">{p.count}</span>
        </div>
      )}
    </div>
  );
}

function formatDateRange(from: string, to: string): string {
  const fm = from.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const tm = to.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!fm || !tm) return `${from} - ${to}`;
  const f = new Date(Number(fm[1]), Number(fm[2]) - 1, Number(fm[3]));
  const t = new Date(Number(tm[1]), Number(tm[2]) - 1, Number(tm[3]));
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (f.getFullYear() !== t.getFullYear()) {
    return `${f.toLocaleDateString("fr-FR", { ...opts, year: "numeric" })} - ${t.toLocaleDateString("fr-FR", { ...opts, year: "numeric" })}`;
  }
  return `${f.toLocaleDateString("fr-FR", opts)} - ${t.toLocaleDateString("fr-FR", opts)}`;
}

function periodDescription(period: Period): string {
  switch (period) {
    case "day": return "Aujourd'hui par heure";
    case "week": return "Cette semaine";
    case "month": return "Ce mois";
    case "year": return "Cette annee";
    default: return "";
  }
}

export default function RevenueChart({ initialData }: { initialData?: DataPoint[] }) {
  const [period, setPeriod] = useState<Period>("month");
  const [data, setData] = useState<DataPoint[]>(initialData ?? []);
  const [meta, setMeta] = useState<{ total: number; count: number; nonZeroPoints: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    if (period === "custom") return;
    if (period === "month" && initialData) {
      setData(initialData);
      const total = initialData.reduce((s, d) => s + d.revenue, 0);
      const count = initialData.reduce((s, d) => s + d.count, 0);
      setMeta({ total, count, nonZeroPoints: initialData.filter((d) => d.revenue > 0).length });
      return;
    }
    setLoading(true);
    fetch(`/api/dashboard/chart?period=${period}`)
      .then((r) => r.json())
      .then((json) => {
        setData(json.data ?? []);
        setMeta(json.meta ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [period, initialData]);

  function handleCustomDateSearch() {
    if (!dateFrom || !dateTo) return;
    setShowDatePicker(false);
    setPeriod("custom");
    setLoading(true);
    fetch(`/api/dashboard/chart?period=custom&from=${dateFrom}&to=${dateTo}`)
      .then((r) => r.json())
      .then((json) => {
        setData(json.data ?? []);
        setMeta(json.meta ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }

  const total = meta?.total ?? data.reduce((s, d) => s + d.revenue, 0);
  const count = meta?.count ?? data.reduce((s, d) => s + d.count, 0);
  const avgPerSale = count > 0 ? total / count : 0;
  const hasData = total > 0 || count > 0;

  // Trouver le pic pour mettre en evidence
  const maxPoint = data.reduce((max, d) => d.revenue > (max?.revenue ?? 0) ? d : max, null as DataPoint | null);

  const subtitle = period === "custom" && dateFrom && dateTo
    ? formatDateRange(dateFrom, dateTo)
    : periodDescription(period);

  return (
    <div className="chart-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 px-6 pt-5 pb-4 border-b border-[var(--color-border-subtle)]">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="section-title">Chiffre d'affaires</h2>
            {hasData && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 uppercase tracking-wider">
                Live
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">{subtitle}</p>

          {/* Trio CA / Ventes / Ticket moyen */}
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 mt-3">
            <div>
              <p className="text-2xl lg:text-3xl font-bold tabular-nums tracking-tight gradient-text leading-none">
                {formatCurrency(total)}
              </p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Total</p>
            </div>
            {count > 0 && (
              <>
                <div>
                  <p className="text-[15px] font-semibold tabular-nums text-zinc-200">{count}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Ventes</p>
                </div>
                <div>
                  <p className="text-[15px] font-semibold tabular-nums text-zinc-200">{formatCurrency(avgPerSale)}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Ticket moy.</p>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-shrink-0">
          <div className="flex bg-zinc-800/60 rounded-lg p-0.5">
            {PERIOD_LABELS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => { setPeriod(key); setShowDatePicker(false); }}
                className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all duration-200 ${
                  period === key
                    ? "bg-[var(--color-accent-muted)] text-rose-400"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative">
            <button
              onClick={() => { setShowDatePicker(!showDatePicker); if (!showDatePicker) setPeriod("custom"); }}
              className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                period === "custom"
                  ? "bg-rose-500/10 text-rose-400"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.03]"
              }`}
              title="Date personnalisee"
            >
              <Calendar size={15} />
            </button>
            {showDatePicker && (
              <div className="absolute right-0 top-full mt-2 z-50">
                <CalendarPicker
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  onChange={(from, to) => { setDateFrom(from); setDateTo(to); }}
                  onApply={handleCustomDateSearch}
                  onClose={() => setShowDatePicker(false)}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="h-[220px] lg:h-[300px] px-2 pt-4">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasData ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <div className="w-12 h-12 rounded-2xl bg-[var(--color-bg-hover)] flex items-center justify-center mb-3">
              <ShoppingCart size={20} className="text-zinc-500" strokeWidth={1.5} />
            </div>
            <p className="text-[13px] font-semibold text-zinc-300">Aucune vente sur cette periode</p>
            <p className="text-[11px] text-zinc-500 mt-1">
              {period === "custom"
                ? "Essaie une autre plage de dates."
                : "Selectionne une autre periode ou cree ta premiere vente."}
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="20%">
              <defs>
                {/* Degrade barres passees : bleu roi plein en haut -> quasi transparent en bas */}
                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-accent-hover)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.15} />
                </linearGradient>
                {/* Degrade highlight barre courante : bleu clair vif -> transparent */}
                <linearGradient id="barGradientHighlight" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#60A5FA" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--color-accent)" stopOpacity={0.25} />
                </linearGradient>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--color-border)"
                vertical={false}
                opacity={0.5}
              />

              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }}
                interval={data.length > 15 ? Math.floor(data.length / 8) : 0}
                tickMargin={8}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "var(--color-text-tertiary)", fontSize: 11 }}
                tickFormatter={formatYAxis}
                width={50}
                tickMargin={4}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "var(--color-accent)", fillOpacity: 0.06 }}
              />

              {/* Reference line sur le pic */}
              {maxPoint && maxPoint.revenue > 0 && data.length > 5 && (
                <ReferenceLine
                  y={maxPoint.revenue}
                  stroke="var(--color-accent)"
                  strokeDasharray="2 2"
                  strokeOpacity={0.25}
                />
              )}

              <Bar
                dataKey="revenue"
                radius={[3, 3, 0, 0]}
                animationDuration={600}
                animationEasing="ease-out"
              >
                {data.map((_, i) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={i === data.length - 1 ? "url(#barGradientHighlight)" : "url(#barGradient)"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
