"use client";

import { useState, useRef, useCallback } from "react";
import { Camera, X, Loader2, Plus } from "lucide-react";
import { uploadProductImage, deleteProductImage } from "@/lib/storage";

export default function ProductImageUpload({
  productId,
  existingImages,
  onImagesChange,
}: {
  productId: string;
  existingImages: string[];
  onImagesChange: (urls: string[]) => void;
}) {
  const [images, setImages] = useState<string[]>(existingImages);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const updateImages = useCallback(
    (newImages: string[]) => {
      setImages(newImages);
      onImagesChange(newImages);
    },
    [onImagesChange]
  );

  async function handleFiles(files: FileList | File[]) {
    const validFiles = Array.from(files).filter((f) =>
      f.type.startsWith("image/") && f.size <= 10 * 1024 * 1024 // 10MB max
    );

    if (validFiles.length === 0) return;
    if (images.length + validFiles.length > 8) {
      alert("Maximum 8 photos par article.");
      return;
    }

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of validFiles) {
        const url = await uploadProductImage(productId, file);
        uploaded.push(url);
      }
      updateImages([...images, ...uploaded]);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Erreur lors de l'upload. Vérifie ta connexion.");
    } finally {
      setUploading(false);
    }
  }

  async function handleRemove(url: string) {
    try {
      await deleteProductImage(url);
      updateImages(images.filter((img) => img !== url));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  }

  function handleDrag(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files);
    }
  }

  return (
    <div className="space-y-3">
      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-4 gap-3">
          {images.map((url, i) => (
            <div key={url} className="relative group aspect-square rounded-lg overflow-hidden bg-stone-100">
              <img
                src={url}
                alt={`Photo ${i + 1}`}
                className="w-full h-full object-cover"
              />
              {/* First image badge */}
              {i === 0 && (
                <span className="absolute top-2 left-2 px-1.5 py-0.5 bg-stone-900/70 text-white text-[9px] font-medium rounded">
                  PRINCIPALE
                </span>
              )}
              <button
                type="button"
                onClick={() => handleRemove(url)}
                className="absolute top-2 right-2 w-6 h-6 bg-stone-900/70 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X size={12} />
              </button>
            </div>
          ))}

          {/* Add more button (if < 8) */}
          {images.length < 8 && !uploading && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="aspect-square rounded-lg border-2 border-dashed border-stone-200 hover:border-amber-400 flex items-center justify-center transition-colors group"
            >
              <Plus size={20} className="text-stone-300 group-hover:text-amber-500 transition-colors" />
            </button>
          )}
        </div>
      )}

      {/* Upload zone (shown when no images or as additional) */}
      {images.length === 0 && (
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? "border-amber-400 bg-amber-50/50"
              : "border-stone-200 hover:border-amber-400 hover:bg-amber-50/30"
          }`}
        >
          {uploading ? (
            <>
              <Loader2 size={32} className="mx-auto text-amber-500 animate-spin" />
              <p className="text-sm text-stone-500 mt-2">Upload en cours...</p>
            </>
          ) : (
            <>
              <Camera size={32} className="mx-auto text-stone-300" />
              <p className="text-sm text-stone-600 mt-2 font-medium">
                Glisse tes photos ici ou clique pour choisir
              </p>
              <p className="text-xs text-stone-400 mt-1">
                JPG, PNG, WebP · Max 10 Mo par image · 8 photos max
              </p>
            </>
          )}
        </div>
      )}

      {/* Uploading overlay for grid mode */}
      {uploading && images.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-amber-700">
          <Loader2 size={14} className="animate-spin" />
          <span>Upload en cours...</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />
    </div>
  );
}
