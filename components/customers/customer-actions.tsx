"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Edit, ShoppingCart, Trash2, X } from "lucide-react";
import { deleteCustomerAction } from "@/lib/actions/customers";

export default function CustomerActions({ customerId, customerName }: { customerId: string; customerName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    startTransition(async () => {
      await deleteCustomerAction(customerId);
    });
  }

  return (
    <>
      <div className="flex items-center gap-1.5 flex-wrap">
        <Link
          href={`/customers/${customerId}/edit`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-zinc-300 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:text-white transition-colors"
          title="Modifier"
        >
          <Edit size={12} />
          <span className="hidden sm:inline">Modifier</span>
        </Link>
        <Link
          href={`/sales/new?customerId=${customerId}`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-rose-500 rounded-lg hover:bg-rose-400 transition-colors"
          title="Nouvelle vente"
        >
          <ShoppingCart size={12} />
          <span className="hidden sm:inline">Nouvelle vente</span>
        </Link>
        <button
          onClick={() => setConfirming(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-zinc-500 bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-lg hover:text-red-400 hover:border-red-500/30 transition-colors"
          title="Supprimer"
        >
          <Trash2 size={12} />
        </button>
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setConfirming(false)}>
          <div className="bg-[var(--color-bg-card)] border border-[var(--color-border)] rounded-xl p-5 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center"><Trash2 size={18} className="text-red-400" /></div>
              <div>
                <h3 className="text-[15px] font-semibold text-white">Supprimer ce client</h3>
                <p className="text-[12px] text-zinc-500 mt-0.5">{customerName}</p>
              </div>
              <button onClick={() => setConfirming(false)} className="ml-auto p-1 rounded hover:bg-[var(--color-bg-hover)] text-zinc-500">
                <X size={16} />
              </button>
            </div>
            <p className="text-[13px] text-zinc-400 mb-5">
              Le client sera supprime mais les ventes associees seront conservees (sans client lie).
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirming(false)} className="px-3 py-2 text-[13px] text-zinc-400 hover:text-zinc-200">Annuler</button>
              <button onClick={handleDelete} disabled={isPending} className="px-4 py-2 text-[13px] font-semibold text-white bg-red-500 rounded-lg hover:bg-red-400 disabled:opacity-50">
                {isPending ? "..." : "Supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
