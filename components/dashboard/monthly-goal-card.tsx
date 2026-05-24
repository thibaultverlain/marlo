"use client";

import { Target, TrendingUp, TrendingDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

/**
 * Carte focale du dashboard : progression vers l'objectif mensuel.
 * Affiche le CA du mois, le pourcentage atteint, le delta vs mois precedent,
 * et une barre de progression.
 *
 * Objectif par defaut : 10 000€/mois (objectif declaré dans CLAUDE.md).
 * Plus tard : pourra etre configure dans shop_settings.
 */
const DEFAULT_GOAL = 10000;

export default function MonthlyGoalCard({
  currentMonthRevenue,
  previousMonthRevenue,
  monthlyGoal = DEFAULT_GOAL,
  monthCount,
}: {
  currentMonthRevenue: number;
  previousMonthRevenue: number;
  monthlyGoal?: number;
  monthCount: number;
}) {
  const progress = Math.min((currentMonthRevenue / monthlyGoal) * 100, 100);
  const remaining = Math.max(monthlyGoal - currentMonthRevenue, 0);
  const monthChange = previousMonthRevenue > 0
    ? ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100
    : 0;

  // Days info — quel jour du mois on est, combien il reste
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeft = daysInMonth - dayOfMonth;
  const monthProgress = (dayOfMonth / daysInMonth) * 100;
  // On compare progress CA vs progress mois pour savoir si on est en avance ou retard
  const onTrack = progress >= monthProgress;

  return (
    <div className="kpi-featured p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-rose-500/15 flex items-center justify-center">
            <Target size={16} className="text-rose-400" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Objectif mensuel</p>
            <p className="text-[12px] text-zinc-500 mt-0.5">
              {dayOfMonth}/{daysInMonth} · {daysLeft} jour{daysLeft > 1 ? "s" : ""} restant{daysLeft > 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className={`flex items-center gap-1 text-[12px] font-semibold ${onTrack ? "text-emerald-400" : "text-amber-400"}`}>
          {onTrack ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {onTrack ? "Sur la bonne voie" : "En retard"}
        </div>
      </div>

      {/* Big number */}
      <div className="flex items-baseline gap-3 mb-1">
        <p className="text-[40px] font-bold tabular-nums tracking-tight leading-none gradient-text">
          {formatCurrency(currentMonthRevenue)}
        </p>
        <p className="text-[14px] text-zinc-500 tabular-nums">
          / {formatCurrency(monthlyGoal)}
        </p>
      </div>
      <p className="text-[12px] text-zinc-500 mt-1">
        {monthCount} vente{monthCount > 1 ? "s" : ""} ce mois
        {monthChange !== 0 && (
          <span className={`ml-2 font-semibold ${monthChange >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            {monthChange >= 0 ? "+" : ""}{monthChange.toFixed(0)}% vs m. dernier
          </span>
        )}
      </p>

      {/* Progress bar */}
      <div className="mt-5">
        <div className="flex justify-between items-baseline mb-1.5">
          <span className="text-[11px] font-semibold text-zinc-400">{progress.toFixed(0)}% atteint</span>
          {remaining > 0 ? (
            <span className="text-[11px] text-zinc-500 tabular-nums">
              Reste {formatCurrency(remaining)}
            </span>
          ) : (
            <span className="text-[11px] font-semibold text-emerald-400">Objectif atteint</span>
          )}
        </div>

        <div className="relative h-2.5 bg-zinc-800/60 rounded-full overflow-hidden">
          {/* Marker du jour du mois — repere d'avancement attendu */}
          <div
            className="absolute top-0 bottom-0 w-px bg-zinc-500 z-10"
            style={{ left: `${monthProgress}%` }}
            aria-label="Position attendue selon le jour du mois"
          />
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${progress}%`,
              background: progress >= 100
                ? "linear-gradient(90deg, var(--color-success) 0%, var(--color-success-bright) 100%)"
                : "linear-gradient(90deg, var(--color-accent) 0%, var(--color-accent-hover) 100%)",
            }}
          />
        </div>
        <p className="text-[10px] text-zinc-500 mt-1.5">
          Le trait gris indique ou tu devrais etre pour rester dans les temps.
        </p>
      </div>
    </div>
  );
}
