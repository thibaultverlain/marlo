"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { Wand2 } from "lucide-react";
import ProductImageUpload from "./product-image-upload";
import PhotoStudioModal from "./photo-studio-modal";

export default function ProductPhotos({ productId, images }: { productId: string; images: string[] }) {
  const router = useRouter();
  const [studioOpen, setStudioOpen] = useState(false);

  const handleImagesChange = useCallback(async (newImages: string[]) => {
    try {
      await fetch(`/api/products/${productId}/images`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: newImages }),
      });
    } catch (err) { console.error("Failed to persist images:", err); }
  }, [productId]);

  return (
    <div className="bg-[var(--color-bg-card)] rounded-[14px] border border-[var(--color-border)] shadow-[var(--shadow-card)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[15px] font-semibold text-white">Photos</h2>
        <button
          onClick={() => setStudioOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-semibold text-white bg-gradient-to-r from-rose-500 to-rose-400 rounded-lg hover:from-rose-400 hover:to-rose-300 transition-all shadow-lg shadow-rose-500/20"
          title="Marlo Studio - Photo professionnelle"
        >
          <Wand2 size={13} />
          Studio Photo
        </button>
      </div>

      <ProductImageUpload productId={productId} existingImages={images} onImagesChange={handleImagesChange} />

      <PhotoStudioModal
        productId={productId}
        open={studioOpen}
        onClose={() => setStudioOpen(false)}
        onSaved={() => {
          setStudioOpen(false);
          router.refresh();
        }}
      />
    </div>
  );
}
