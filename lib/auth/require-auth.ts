import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

export async function requireAuth(): Promise<{ user: any } | NextResponse> {
  try {
    const headerStore = await headers();
    const ip = headerStore.get("x-forwarded-for") ?? headerStore.get("x-real-ip") ?? "unknown";
    const { allowed } = rateLimit(ip);
    if (!allowed) {
      return NextResponse.json({ error: "Trop de requêtes" }, { status: 429 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); } catch {}
          },
        },
      }
    );

    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    return { user };
  } catch {
    return NextResponse.json({ error: "Erreur d'authentification" }, { status: 401 });
  }
}
