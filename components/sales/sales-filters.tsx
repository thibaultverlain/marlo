"use client";

import { useRouter, useSearchParams } from "next/navigation";

const PERIODS = [
  { key: "all", label: "Tout" },
  { key: "year", label: "Année" },
  { key: "month", label: "Mois" },
  { key: "week", label: "Semaine" },
];

export default function SalesFilters({ currentPeriod }: { currentPeriod: string }) {
  const router = useRouter();

  function handleChange(period: string) {
    const params = new URLSearchParams();
    if (period !== "all") params.set("period", period);
    router.push(`/sales${params.toString() ? `?${params}` : ""}`);
  }

  return (
    <div className="flex bg-zinc-800/60 rounded-lg p-0.5 w-fit">
      {PERIODS.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => handleChange(key)}
          className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${
            currentPeriod === key
              ? "bg-cyan-500 text-white shadow-sm"
              : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
