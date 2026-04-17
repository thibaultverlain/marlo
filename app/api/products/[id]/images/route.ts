import { NextRequest, NextResponse } from "next/server";
import { updateProduct } from "@/lib/db/queries/products";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const body = await req.json();
    const images: string[] = body.images;

    if (!Array.isArray(images)) {
      return NextResponse.json({ error: "images doit être un tableau" }, { status: 400 });
    }

    await updateProduct(id, { images });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update product images error:", err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
