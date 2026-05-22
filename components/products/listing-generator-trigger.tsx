"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import ListingGeneratorModal from "./listing-generator-modal";

export default function ListingGeneratorTrigger({
  productId,
  hasImages,
}: {
  productId: string;
  hasImages: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="card-static p-5 hover:border-[var(--color-border-hover)] transition-all">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
            <Sparkles size={18} className="text-rose-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-white">Generer une annonce</p>
            <p className="text-[12px] text-zinc-500 mt-0.5">
              IA optimisee pour Vinted ou Vestiaire Collective
            </p>
          </div>
          <button
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-gradient-to-r from-rose-500 to-rose-400 rounded-lg hover:from-rose-400 hover:to-rose-300 transition-all shadow-lg shadow-rose-500/20"
          >
            <Sparkles size={12} />
            Generer
          </button>
        </div>
      </div>

      <ListingGeneratorModal
        productId={productId}
        hasImages={hasImages}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
