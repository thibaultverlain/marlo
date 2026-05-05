import { NextRequest, NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Rate limit by IP
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  const { allowed } = rateLimit(`upload:${ip}`);
  if (!allowed) {
    return NextResponse.json({ error: "Trop de requetes. Reessayez dans 1 minute." }, { status: 429 });
  }

  let ctx;
  try { ctx = await getAuthContext(); } catch {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  if (ctx.role !== "owner") {
    return NextResponse.json({ error: "Acces refuse" }, { status: 403 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ error: "Aucun fichier" }, { status: 400 });
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
    }

    // MIME type whitelist
    const ALLOWED_TYPES = [
      "application/pdf",
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/plain", "text/csv",
    ];
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: `Type de fichier non autorise: ${file.type}` }, { status: 400 });
    }

    // Sanitize filename: remove path traversal
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

    const supabase = await createSupabaseServerClient();
    const ext = safeName.split(".").pop() ?? "pdf";
    const path = `${ctx.shopId}/${Date.now()}-${crypto.randomUUID().substring(0, 8)}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const { data, error } = await supabase.storage
      .from("documents")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(path);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: data.path,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.type,
    });
  } catch (err: any) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: err.message || "Erreur upload" }, { status: 500 });
  }
}
