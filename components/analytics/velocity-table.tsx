"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, Zap } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { VelocityRow } from "@/lib/db/queries/sales-analytics";
import { CATEGORIES, CHANNELS } from "@/lib/data";

type SortKey = keyof Pick<VelocityRow, "salesCount" | "avgDaysToSell" | "medianDaysToSell" | "totalRevenue" | "avgMarginPct">;

const SPEED_BUCKETS = [
  { max: 7,   label: "Lightning",  color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { max: 14,  label: "Rapide",     color: "text-cyan-400",    bg: "bg-cyan-500/10" },
  { max: 30,  label: "Normal",     color: "text-zinc-400",    bg: "bg-zinc-500/10" },
  { max: 60,  label: "Lent",       color: "text-yellow-400",  bg: "bg-yellow-500/10" },
  { max: 9999,label: "Tres lent",  color: "text-red-400",     bg: "bg-red-500/10" },
];

function speedBadge(days: number) {
  return SPEED_BUCKETS.find((b) => days <= b.max) ?? SPEED_BUCKETS[SPEED_BUCKETS.length - 1];
}

export default function VelocityTable({
  rows,
  groupBy,
}: {
  rows: VelocityRow[];
  groupBy: "brand" | "category" | "channel";
}) {
  const [sortKey, setSortKey] = useState<SortKey>("avgDaysToSell");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const enrichedRows = useMemo(
    () =>
      rows.map((r) => {
        let label = r.label;
        if (groupBy === "category") {
          label = CATEGORIES.find((c) => c.value === r.key)?.label ?? r.key;
        } else if (groupBy === "channel") {
          label = CHANNELS.find((c) => c.value === r.key)?.label ?? r.key;
        }
        return { ...r, label };
      }),
    [rows, groupBy],
  );

  const sorted = useMemo(() => {
    return [...enrichedRows].sort((a, b) => {
      const diff = (a[sortKey] as number) - (b[sortKey] as number);
      return sortDir === "asc" ? diff : -diff;
    });
  }, [enrichedRows, sortKey, sortDir]);

  function toggle(k: SortKey) {
    if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(k); setSortDir(k === "avgDaysToSell" || k === "medianDaysToSell" ? "asc" : "desc"); }
  }

  if (rows.length === 0) {
    return (
      <div className="card-static p-8 text-center text-zinc-500 text-sm">
        Pas assez de ventes avec un produit lie pour calculer la vitesse de vente.
      </div>
    );
  }

  return (
    <div className="card-static overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[13px]">
          <thead className="bg-[var(--color-bg-raised)] border-b border-[var(--color-border)]">
            <tr className="text-left">
              <Th>{groupBy === "brand" ? "Marque" : groupBy === "category" ? "Categorie" : "Canal"}</Th>
              <ThSort active={sortKey === "salesCount"} dir={sortDir} onClick={() => toggle("salesCount")}>Ventes</ThSort>
              <ThSort active={sortKey === "avgDaysToSell"} dir={sortDir} onClick={() => toggle("avgDaysToSell")}>Duree moy.</ThSort>
              <ThSort active={sortKey === "medianDaysToSell"} dir={sortDir} onClick={() => toggle("medianDaysToSell")}>Mediane</ThSort>
              <Th>Min / Max</Th>
              <ThSort active={sortKey === "totalRevenue"} dir={sortDir} onClick={() => toggle("totalRevenue")}>CA</ThSort>
              <ThSort active={sortKey === "avgMarginPct"} dir={sortDir} onClick={() => toggle("avgMarginPct")}>Marge moy.</ThSort>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const badge = speedBadge(row.avgDaysToSell);
              return (
                <tr key={row.key} className="border-b border-[var(--color-border-subtle)] last:border-0 hover:bg-[var(--color-bg-hover)]">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-white capitalize">{row.label}</span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-300">{row.salesCount}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md ${badge.bg}`}>
                      <Zap size={10} className={badge.color} />
                      <span className={`tabular-nums font-semibold ${badge.color}`}>{row.avgDaysToSell.toFixed(1)}j</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-400">{row.medianDaysToSell.toFixed(1)}j</td>
                  <td className="px-4 py-3 tabular-nums text-zinc-500 text-[11px]">
                    {row.fastestDays}j → {row.slowestDays}j
                  </td>
                  <td className="px-4 py-3 tabular-nums text-zinc-300 font-medium">{formatCurrency(row.totalRevenue)}</td>
                  <td className="px-4 py-3 tabular-nums">
                    <span className={row.avgMarginPct >= 30 ? "text-emerald-400" : row.avgMarginPct >= 10 ? "text-yellow-400" : "text-red-400"}>
                      {row.avgMarginPct.toFixed(1)}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{children}</th>;
}

function ThSort({ active, dir, onClick, children }: { active: boolean; dir: "asc" | "desc"; onClick: () => void; children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5">
      <button onClick={onClick} className={`flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider ${active ? "text-zinc-200" : "text-zinc-500"}`}>
        {children}
        <ArrowUpDown size={9} className={active ? "" : "opacity-30"} />
      </button>
    </th>
  );
}
