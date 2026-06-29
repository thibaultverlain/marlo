import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/require-role";
import { uploadShippingPhoto } from "@/lib/storage";
import { db } from "@/lib/db/client";
import { sales } from "@/lib/db/schema";
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

  const { id: saleId } = await params;

  const [order] = await db
    .select({ id: sales.id, photos: sales.shippingPhotos })
    .from(sales)
    .where(and(eq(sales.id, saleId), eq(sales.shopId, ctx.shopId)))
    .limit(1);

  if (!order) {
    return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "Aucun fichier envoye" }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 10MB)" }, { status: 413 });
    }

    const url = await uploadShippingPhoto(saleId, file);
    const newPhotos = [...(order.photos ?? []), url];
    await db.update(sales).set({ shippingPhotos: newPhotos }).where(eq(sales.id, saleId));

    return NextResponse.json({ success: true, url, photos: newPhotos });
  } catch (err: any) {
    console.error("Upload shipping photo error:", err);
    return NextResponse.json({ error: err.message ?? "Erreur d'upload" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let ctx;
  try {
    ctx = await getAuthContext();
  } catch {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  const { id: saleId } = await params;
  const { url } = await req.json();
  if (!url) return NextResponse.json({ error: "URL manquante" }, { status: 400 });

  const [order] = await db
    .select({ id: sales.id, photos: sales.shippingPhotos })
    .from(sales)
    .where(and(eq(sales.id, saleId), eq(sales.shopId, ctx.shopId)))
    .limit(1);
  if (!order) return NextResponse.json({ error: "Commande introuvable" }, { status: 404 });

  try {
    const { deleteShippingPhoto } = await import("@/lib/storage");
    await deleteShippingPhoto(url);
    const newPhotos = (order.photos ?? []).filter((u: string) => u !== url);
    await db.update(sales).set({ shippingPhotos: newPhotos }).where(eq(sales.id, saleId));
    return NextResponse.json({ success: true, photos: newPhotos });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? "Erreur" }, { status: 500 });
  }
}
