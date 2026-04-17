"use client";

import { useCallback } from "react";
import ProductImageUpload from "./product-image-upload";

export default function ProductPhotos({ productId, images }: { productId: string; images: string[] }) {
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
    <div className="bg-[var(--color-bg-card)] rounded-xl border border-[var(--color-border)] p-6">
      <h2 className="text-[15px] font-semibold text-white mb-4">Photos</h2>
      <ProductImageUpload productId={productId} existingImages={images} onImagesChange={handleImagesChange} />
    </div>
  );
}
