import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public routes that don't need auth
  const publicRoutes = ["/login", "/api/webhook/email", "/api/cron", "/api/auth/callback"];
  const isPublic =
    publicRoutes.some((r) => pathname.startsWith(r)) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/icons") ||
    pathname === "/manifest.json" ||
    pathname === "/sw.js" ||
    pathname === "/logo.svg" ||
    pathname === "/favicon.png" ||
    pathname === "/favicon-32.png" ||
    pathname === "/";

  if (isPublic) {
    addSecurityHeaders(supabaseResponse);
    return supabaseResponse;
  }

  // If not logged in, redirect to login
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  // If logged in and on login page, redirect to dashboard
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  addSecurityHeaders(supabaseResponse);
  return supabaseResponse;
}

function addSecurityHeaders(response: NextResponse) {
  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");
  // Prevent MIME sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");
  // Referrer policy: send origin only on cross-origin
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  // Disable browser features we don't use
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  // HSTS: force HTTPS for 1 year (only in production)
  if (process.env.NODE_ENV === "production") {
    response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
