import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Verify that the request is from an authenticated user.
 * Use in API routes that need protection.
 * Returns the user if authenticated, or a 401 response.
 */
export async function requireAuth(): Promise<{ user: any } | NextResponse> {
  try {
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
