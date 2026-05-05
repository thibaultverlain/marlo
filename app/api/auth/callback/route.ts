import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { acceptInvitation } from "@/lib/db/queries/team";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const inviteToken = searchParams.get("invite");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  // Prevent open redirect: only allow relative paths starting with /
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );

  // Handle OAuth callback
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=auth_failed`);
    }
  }

  // Handle team invitation acceptance
  if (inviteToken) {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        await acceptInvitation(inviteToken, user.id);
        return NextResponse.redirect(`${origin}/dashboard?joined=true`);
      } catch (e: any) {
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(e.message)}`);
      }
    } else {
      // Not logged in — redirect to login with invite token preserved
      return NextResponse.redirect(`${origin}/login?invite=${inviteToken}`);
    }
  }

  if (code) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
