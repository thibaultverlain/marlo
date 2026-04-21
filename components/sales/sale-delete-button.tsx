"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deleteSaleAction } from "@/lib/actions/sales";

export default function SaleDeleteButton({ saleId }: { saleId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Supprimer cette vente ?")) return;
    startTransition(async () => {
      await deleteSaleAction(saleId);
    });
  }

  return (
    <div className="flex items-center justify-end pt-4 border-t border-[var(--color-border)]">
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
      >
        <Trash2 size={14} />
        {isPending ? "Suppression..." : "Supprimer cette vente"}
      </button>
    </div>
  );
}
