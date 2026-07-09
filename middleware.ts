import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const GESTOR_ONLY_PATHS = ["/metas", "/usuarios", "/anuncios"];
const SDR_GESTOR_PATHS = ["/lancamento"];
const PUBLIC_PATHS = ["/login", "/signup", "/auth/callback", "/forgot-password", "/reset-password"];
const WEBHOOK_PATHS = ["/api/leads/ingest"];

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // WEBHOOK_PATHS must bypass Supabase auth entirely — otherwise unauthenticated
  // POSTs from Make/webhooks receive a 302 redirect to /login and leads are lost
  // silently. Bypass MUST be the first code — before createServerClient is called.
  if (WEBHOOK_PATHS.some((p) => path.startsWith(p))) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const isPublicPath = PUBLIC_PATHS.some((p) => path.startsWith(p));

  if (!user) {
    if (!isPublicPath) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  const role = profile?.role;
  const homePath = role === "pendente" ? "/pendente" : "/dashboard";

  if (path === "/login" || path === "/signup") {
    const url = request.nextUrl.clone();
    url.pathname = homePath;
    return NextResponse.redirect(url);
  }

  if (role === "pendente" && path !== "/pendente") {
    const url = request.nextUrl.clone();
    url.pathname = "/pendente";
    return NextResponse.redirect(url);
  }

  if (role !== "pendente") {
    const isGestorPath = GESTOR_ONLY_PATHS.some((p) => path.startsWith(p));
    const isSdrGestorPath = SDR_GESTOR_PATHS.some((p) => path.startsWith(p));

    const allowed = isGestorPath
      ? role === "gestor"
      : isSdrGestorPath
        ? role === "sdr" || role === "gestor"
        : true;

    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
