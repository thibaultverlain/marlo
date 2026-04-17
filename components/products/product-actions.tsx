"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Trash2, ShoppingCart } from "lucide-react";
import { deleteProductAction } from "@/lib/actions/products";

export default function ProductActions({ productId, status }: { productId: string; status: string }) {
  const [isPending, startTransition] = useTransition();
  const canBeSold = !["vendu", "livre", "retourne"].includes(status);

  function handleDelete() {
    if (!confirm("Supprimer définitivement cet article ?")) return;
    startTransition(async () => { await deleteProductAction(productId); });
  }

  return (
    <div className="flex items-center justify-between pt-4 border-t border-[var(--color-border)] pb-8">
      <button onClick={handleDelete} disabled={isPending} className="flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50">
        <Trash2 size={14} />Supprimer
      </button>
      {canBeSold && (
        <Link href={`/sales/new?productId=${productId}`} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors">
          <ShoppingCart size={14} />Enregistrer la vente
        </Link>
      )}
    </div>
  );
}
