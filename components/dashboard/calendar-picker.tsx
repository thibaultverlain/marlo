"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

const MONTHS = ["Janvier", "Fevrier", "Mars", "Avril", "Mai", "Juin", "Juillet", "Aout", "Septembre", "Octobre", "Novembre", "Decembre"];
const DAYS = ["L", "M", "M", "J", "V", "S", "D"];

const PRESETS = [
  { label: "7 jours", days: 7 },
  { label: "30 jours", days: 30 },
  { label: "90 jours", days: 90 },
  { label: "Ce mois", monthStart: true },
  { label: "Mois dernier", monthLast: true },
  { label: "Cette annee", yearStart: true },
];

// IMPORTANT : on travaille en HEURE LOCALE pour eviter le bug de decalage
// d'un jour (toISOString() convertit en UTC). YYYY-MM-DD reste un format
// neutre, mais il doit representer le jour vu par l'utilisateur, pas en UTC.
function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseISO(s: string): Date | null {
  if (!s) return null;
  // Parse en heure locale pour rester coherent avec toISO ci-dessus
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isNaN(d.getTime()) ? null : d;
}

function sameDay(a: Date, b: Date | null): boolean {
  if (!b) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function inRange(d: Date, from: Date | null, to: Date | null): boolean {
  if (!from || !to) return false;
  return d >= from && d <= to;
}

export default function CalendarPicker({
  dateFrom, dateTo, onChange, onApply, onClose,
}: {
  dateFrom: string;
  dateTo: string;
  onChange: (from: string, to: string) => void;
  onApply: () => void;
  onClose: () => void;
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parseISO(dateFrom) ?? new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [hoverDate, setHoverDate] = useState<Date | null>(null);

  const from = parseISO(dateFrom);
  const to = parseISO(dateTo);

  function handleDayClick(d: Date) {
    if (!from || (from && to)) {
      // Start new range
      onChange(toISO(d), "");
    } else if (from && !to) {
      // Complete range
      if (d < from) {
        onChange(toISO(d), toISO(from));
      } else {
        onChange(toISO(from), toISO(d));
      }
    }
  }

  function handlePreset(p: typeof PRESETS[number]) {
    const now = new Date();
    let start: Date, end: Date;
    if (p.days) {
      end = now;
      start = new Date(now);
      start.setDate(start.getDate() - p.days);
    } else if (p.monthStart) {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = now;
    } else if (p.monthLast) {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 0);
    } else if (p.yearStart) {
      start = new Date(now.getFullYear(), 0, 1);
      end = now;
    } else return;
    onChange(toISO(start), toISO(end));
    setViewMonth(new Date(start.getFullYear(), start.getMonth(), 1));
  }

  // Build calendar grid
  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const lastOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 0);
  const startWeekday = (firstOfMonth.getDay() + 6) % 7; // Monday-first
  const daysInMonth = lastOfMonth.getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), d));
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const hoverEnd = from && !to && hoverDate ? hoverDate : null;
  const rangeEnd = to ?? hoverEnd;

  return (
    <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-xl shadow-black/40 p-4 w-[min(340px,calc(100vw-2rem))]">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--color-bg-hover)] text-zinc-500 hover:text-zinc-300">
          <ChevronLeft size={14} />
        </button>
        <p className="text-[13px] font-semibold text-white">
          {MONTHS[viewMonth.getMonth()]} {viewMonth.getFullYear()}
        </p>
        <div className="flex items-center gap-1">
          <button onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--color-bg-hover)] text-zinc-500 hover:text-zinc-300">
            <ChevronRight size={14} />
          </button>
          <button onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-[var(--color-bg-hover)] text-zinc-500 hover:text-zinc-300 ml-1">
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DAYS.map((d, i) => (
          <div key={i} className="text-center text-[10px] font-semibold text-zinc-500 uppercase tracking-wider py-1">{d}</div>
        ))}
      </div>

      {/* Calendar cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const isStart = sameDay(d, from);
          const isEnd = sameDay(d, to);
          const isInRange = inRange(d, from, rangeEnd);
          const isToday = sameDay(d, today);
          const isFuture = d > today;

          let cellClass = "h-8 text-[12px] font-medium rounded-md flex items-center justify-center transition-all cursor-pointer ";
          if (isStart || isEnd) {
            cellClass += "bg-rose-500 text-white font-bold ";
          } else if (isInRange) {
            cellClass += "bg-rose-500/15 text-rose-300 ";
          } else if (isToday) {
            cellClass += "text-rose-400 ring-1 ring-rose-500/30 ";
          } else if (isFuture) {
            cellClass += "text-zinc-700 cursor-not-allowed ";
          } else {
            cellClass += "text-zinc-400 hover:bg-[var(--color-bg-hover)] ";
          }

          return (
            <button
              key={i}
              disabled={isFuture}
              onClick={() => !isFuture && handleDayClick(d)}
              onMouseEnter={() => setHoverDate(d)}
              onMouseLeave={() => setHoverDate(null)}
              className={cellClass}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>

      {/* Presets */}
      <div className="grid grid-cols-3 gap-1 mt-3 pt-3 border-t border-[var(--color-border)]">
        {PRESETS.map((p) => (
          <button key={p.label} onClick={() => handlePreset(p)}
            className="px-2 py-1.5 text-[11px] font-medium rounded-md text-zinc-500 hover:text-zinc-200 hover:bg-[var(--color-bg-hover)] transition">
            {p.label}
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-[var(--color-border)]">
        <p className="text-[11px] text-zinc-500 tabular-nums">
          {from && to
            ? `${from.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })} - ${to.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}`
            : from
            ? `Depuis ${from.toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}...`
            : "Selectionne une periode"}
        </p>
        <button onClick={onApply} disabled={!from || !to}
          className="px-3 py-1.5 text-[11px] font-semibold text-[var(--color-text-inverse)] bg-rose-500 rounded-md hover:bg-rose-400 transition disabled:opacity-40 disabled:cursor-not-allowed">
          Afficher
        </button>
      </div>
    </div>
  );
}
