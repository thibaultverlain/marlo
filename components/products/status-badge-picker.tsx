"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { updateProductStatusAction } from "@/lib/actions/products";

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string; ring: string }> = {
  en_stock: { bg: "bg-zinc-500/12 border-zinc-500/25", text: "text-zinc-300", dot: "bg-zinc-400", ring: "hover:ring-zinc-500/40" },
  en_vente: { bg: "bg-rose-500/12 border-rose-500/25", text: "text-rose-400", dot: "bg-rose-400", ring: "hover:ring-rose-500/40" },
  reserve:  { bg: "bg-amber-500/12 border-amber-500/25", text: "text-amber-400", dot: "bg-amber-400", ring: "hover:ring-amber-500/40" },
  vendu:    { bg: "bg-emerald-500/15 border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-400", ring: "hover:ring-emerald-500/40" },
  expedie:  { bg: "bg-emerald-500/10 border-emerald-500/20", text: "text-emerald-300", dot: "bg-emerald-300", ring: "hover:ring-emerald-500/40" },
  livre:    { bg: "bg-emerald-500/20 border-emerald-500/35", text: "text-emerald-400", dot: "bg-emerald-400", ring: "hover:ring-emerald-500/40" },
  retourne: { bg: "bg-red-500/12 border-red-500/25", text: "text-red-400", dot: "bg-red-400", ring: "hover:ring-red-500/40" },
};

const STATUS_LABELS: Record<string, string> = {
  en_stock: "En stock", en_vente: "En vente", reserve: "Reserve",
  vendu: "Vendu", expedie: "Expedie", livre: "Livre", retourne: "Retourne",
};

const STATUS_ORDER = ["en_stock", "en_vente", "reserve", "vendu", "expedie", "livre", "retourne"];

export default function StatusBadgePicker({
  productId,
  status,
  compact = false,
}: {
  productId: string;
  status: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [optimisticStatus, setOptimisticStatus] = useState(status);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => { setOptimisticStatus(status); }, [status]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const s = STATUS_STYLES[optimisticStatus] ?? STATUS_STYLES.en_stock;

  function pick(next: string) {
    if (next === optimisticStatus) { setOpen(false); return; }
    setOptimisticStatus(next);
    setOpen(false);
    startTransition(async () => {
      const res = await updateProductStatusAction(productId, next);
      if (res.error) {
        setOptimisticStatus(status); // rollback
        console.error(res.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen((o) => !o); }}
        disabled={isPending}
        className={`inline-flex items-center ${compact ? "px-2 py-0.5 text-[10.5px]" : "px-2.5 py-1 text-[11px]"} rounded-lg font-semibold border ${s.bg} ${s.text} ring-1 ring-transparent transition-all ${s.ring} hover:ring-1 disabled:opacity-60 cursor-pointer whitespace-nowrap`}
        title="Cliquer pour changer le statut"
      >
        {isPending ? (
          <Loader2 size={10} className="animate-spin mr-1.5" />
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${s.dot}`} />
        )}
        {STATUS_LABELS[optimisticStatus] ?? optimisticStatus}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-1 z-50 min-w-[150px] bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg shadow-xl shadow-black/40 py-1"
          onClick={(e) => e.stopPropagation()}
        >
          {STATUS_ORDER.map((v) => {
            const cfg = STATUS_STYLES[v];
            const active = v === optimisticStatus;
            return (
              <button
                key={v}
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); pick(v); }}
                className={`w-full px-3 py-1.5 text-left text-[12px] flex items-center gap-2 hover:bg-[var(--color-bg-hover)] transition ${active ? "text-white font-semibold" : "text-zinc-300"}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                <span className="flex-1">{STATUS_LABELS[v]}</span>
                {active && <Check size={11} className="text-rose-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
