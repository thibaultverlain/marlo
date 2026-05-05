"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { Store, ChevronDown, Check } from "lucide-react";
import { switchShopAction } from "@/lib/actions/shop";
import { useRouter } from "next/navigation";

type Shop = { shopId: string; shopName: string; role: string };

export default function ShopSwitcher({
  shops,
  currentShopId,
  currentShopName,
}: {
  shops: Shop[];
  currentShopId: string;
  currentShopName: string;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const panelRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Don't show if only one shop
  if (shops.length <= 1) {
    return (
      <div className="px-5 pb-3 hidden lg:block">
        <div className="flex items-center gap-2 text-[11px] text-zinc-600">
          <Store size={12} />
          <span className="truncate">{currentShopName}</span>
        </div>
      </div>
    );
  }

  function handleSwitch(shopId: string) {
    if (shopId === currentShopId) {
      setOpen(false);
      return;
    }
    startTransition(async () => {
      await switchShopAction(shopId);
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="px-3 pb-2 hidden lg:block relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-[12px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)] transition-all"
      >
        <Store size={13} className="flex-shrink-0" />
        <span className="truncate flex-1 text-left">{currentShopName}</span>
        <ChevronDown size={12} className={`flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl shadow-xl shadow-black/10 z-50 py-1 animate-in">
          {shops.map((s) => (
            <button
              key={s.shopId}
              onClick={() => handleSwitch(s.shopId)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-colors rounded-lg mx-0 ${
                s.shopId === currentShopId
                  ? "text-rose-400 bg-rose-500/5"
                  : "text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-bg-hover)]"
              }`}
            >
              <Store size={12} className="flex-shrink-0" />
              <span className="truncate flex-1 text-left">{s.shopName}</span>
              {s.shopId === currentShopId && <Check size={12} className="flex-shrink-0" />}
            </button>
          ))}
        </div>
      )}

      <style jsx>{`
        .animate-in {
          animation: switcherIn 0.12s ease-out;
        }
        @keyframes switcherIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
