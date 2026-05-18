"use client";

import { useState, useTransition } from "react";
import { RotateCcw, X, Package } from "lucide-react";
import { declareReturnAction } from "@/lib/actions/orders";

export default function SaleReturnButton({ saleId, alreadyReturned }: { saleId: string; alreadyReturned: boolean }) {
  const [open, setOpen] = useState(false);
  const [restock, setRestock] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await declareReturnAction(saleId, restock);
      if (result.error) setError(result.error);
      else setOpen(false);
    });
  }

  if (alreadyReturned) {
    return (
      <div className="card-static p-4 bg-red-500/[0.05] border-red-500/15">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500/15 flex items-center justify-center flex-shrink-0">
            <RotateCcw size={16} className="text-red-400" />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-red-300">Vente retournee</p>
            <p className="text-[11px] text-red-400/70 mt-0.5">Le paiement a ete marque comme rembourse</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium text-red-400 bg-red-500/[0.05] border border-red-500/20 rounded-lg hover:bg-red-500/10 transition-colors"
        >
          <RotateCcw size={14} />
          Declarer un retour
        </button>
      ) : (
        <div className="card-static p-5 space-y-4">
          <div className="flex items-center gap-2">
            <RotateCcw size={16} className="text-red-400" />
            <h3 className="text-[14px] font-semibold text-white">Declarer un retour</h3>
            <button onClick={() => setOpen(false)} className="ml-auto p-1 rounded hover:bg-[var(--color-bg-hover)] text-zinc-500 hover:text-zinc-300">
              <X size={14} />
            </button>
          </div>

          <div className="bg-amber-500/[0.05] border border-amber-500/15 rounded-lg p-3">
            <p className="text-[12px] text-amber-300 font-medium">Cela va :</p>
            <ul className="text-[11px] text-amber-400/80 mt-1 space-y-0.5 list-disc list-inside">
              <li>Marquer la vente comme retournee</li>
              <li>Passer le paiement en rembourse</li>
              {restock && <li>Remettre l'article en stock</li>}
            </ul>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-bg)]/40">
            <button
              type="button"
              onClick={() => setRestock(!restock)}
              className={`w-9 h-5 rounded-full transition-colors relative flex-shrink-0 ${restock ? "bg-rose-500" : "bg-zinc-700"}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${restock ? "translate-x-4" : "translate-x-0.5"}`} />
            </button>
            <div className="flex-1">
              <p className="text-[13px] text-white flex items-center gap-2">
                <Package size={13} className="text-zinc-500" />
                Remettre l'article en stock
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                {restock ? "L'article reviendra dans ton stock disponible" : "L'article restera marque comme vendu"}
              </p>
            </div>
          </div>

          {error && (
            <div className="rounded-lg px-3 py-2 text-[12px] bg-red-500/10 text-red-400 border border-red-500/20">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button onClick={() => setOpen(false)} className="px-3 py-2 text-[13px] text-zinc-500 hover:text-zinc-300">
              Annuler
            </button>
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="px-4 py-2 text-[13px] font-semibold text-white bg-red-500 rounded-lg hover:bg-red-400 transition disabled:opacity-50"
            >
              {isPending ? "..." : "Confirmer le retour"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
