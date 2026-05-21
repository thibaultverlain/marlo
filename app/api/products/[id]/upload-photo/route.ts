import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/require-role";
import { uploadProductImage } from "@/lib/storage";
import { db } from "@/lib/db/client";
import { products } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await getAuthContext();
  } catch {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const { id: productId } = await params;

  // Verify the product belongs to user's shop
  const [product] = await db
    .select({ id: products.id, images: products.images })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.shopId, ctx.shopId)))
    .limit(1);

  if (!product) {
    return NextResponse.json({ error: "Produit introuvable" }, { status: 404 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Aucun fichier envoye" }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 10MB)" }, { status: 413 });
    }

    // Upload to Supabase Storage
    const url = await uploadProductImage(productId, file);

    // Append to product.images
    const newImages = [...(product.images ?? []), url];
    await db
      .update(products)
      .set({ images: newImages, updatedAt: new Date() })
      .where(eq(products.id, productId));

    return NextResponse.json({ success: true, url });
  } catch (err: any) {
    console.error("Upload photo error:", err);
    return NextResponse.json({ error: err.message ?? "Erreur d'upload" }, { status: 500 });
  }
}
