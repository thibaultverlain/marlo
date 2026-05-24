"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

export default function AuthCheckTrigger({
  brand,
  productId,
}: {
  brand: string;
  productId: string;
}) {
  const brandSlug = brand.toLowerCase()
    .replace(/é|è|ê/g, "e")
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  // Map brand names to checklist IDs
  const BRAND_MAP: Record<string, string> = {
    hermes:          "hermes",
    hermès:          "hermes",
    chanel:          "chanel",
    louis_vuitton:   "lv",
    lv:              "lv",
    gucci:           "gucci",
    dior:            "dior",
    christian_dior:  "dior",
    bottega_veneta:  "bottega",
    bottega:         "bottega",
    balenciaga:      "balenciaga",
    burberry:        "burberry",
    moncler:         "moncler",
    celine:          "celine",
    céline:          "celine",
    courreges:       "courreges",
    courrèges:       "courreges",
  };

  const checklistBrand = BRAND_MAP[brandSlug] ?? "";
  const href = checklistBrand
    ? `/authentification?brand=${checklistBrand}&productId=${productId}`
    : `/authentification?productId=${productId}`;

  return (
    <div className="card-static p-5 hover:border-[var(--color-border-hover)] transition-all">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center flex-shrink-0">
          <ShieldCheck size={18} className="text-emerald-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-semibold text-white">Verifier l'authenticite</p>
          <p className="text-[12px] text-zinc-500 mt-0.5">
            Checklist de verification par marque
          </p>
        </div>
        <Link
          href={href}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all"
        >
          <ShieldCheck size={12} />
          Verifier
        </Link>
      </div>
    </div>
  );
}
