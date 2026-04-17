import { supabase } from "@/lib/supabase";

const BUCKET = "product-images";

/**
 * Upload a product image to Supabase Storage.
 * Returns the public URL on success.
 */
export async function uploadProductImage(
  productId: string,
  file: File
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const filename = `${productId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(filename, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error("Upload error:", error);
    throw new Error(`Erreur d'upload : ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

/**
 * Delete a product image from Supabase Storage.
 */
export async function deleteProductImage(imageUrl: string): Promise<void> {
  // Extract path from full URL
  // URL looks like: https://xxx.supabase.co/storage/v1/object/public/product-images/productId/filename.jpg
  const parts = imageUrl.split(`/storage/v1/object/public/${BUCKET}/`);
  if (parts.length < 2) return;

  const path = parts[1];
  const { error } = await supabase.storage.from(BUCKET).remove([path]);

  if (error) {
    console.error("Delete error:", error);
  }
}

/**
 * Delete all images for a product.
 */
export async function deleteAllProductImages(productId: string): Promise<void> {
  const { data: files } = await supabase.storage
    .from(BUCKET)
    .list(productId);

  if (files && files.length > 0) {
    const paths = files.map((f) => `${productId}/${f.name}`);
    await supabase.storage.from(BUCKET).remove(paths);
  }
}
