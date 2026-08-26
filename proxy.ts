import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { decryptSession, SESSION_COOKIE_NAME } from "@/lib/auth/jwt";
import { isAllowedPage, isAdminLevel, ADMIN_ONLY_ALL_METHODS_PREFIXES, ADMIN_ONLY_WRITE_PREFIXES } from "@/lib/auth/access";
import type { UserRole } from "@/models/User";

// Next.js 16 renamed middleware.ts -> proxy.ts (see
// node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md)
// — same runtime/behavior, just the file+export name changed.

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // /api/auth/* has to work with no session yet (that's the whole point of
  // /login) — exempt it before any auth check runs.
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await decryptSession(token);

  if (pathname === "/login") {
    if (session?.userId) return NextResponse.redirect(new URL("/", request.url));
    return NextResponse.next();
  }

  if (!session?.userId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Belum login" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.role as UserRole;

  if (pathname.startsWith("/api/")) {
    if (!isAdminLevel(role)) {
      const fullyRestricted = ADMIN_ONLY_ALL_METHODS_PREFIXES.some((p) => pathname.startsWith(p));
      const writeRestricted =
        request.method !== "GET" && ADMIN_ONLY_WRITE_PREFIXES.some((p) => pathname.startsWith(p));
      if (fullyRestricted || writeRestricted) {
        return NextResponse.json({ error: "Tidak punya akses" }, { status: 403 });
      }
    }
    return NextResponse.next();
  }

  if (!isAllowedPage(role, pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

// Also excludes public/ static assets by file extension (logo, favicons,
// etc.) — found 2026-08-26 while chasing "logo hilang dari Katalog PDF":
// this matcher used to gate EVERYTHING except _next/static and favicon.ico,
// including /logo/hojay-2b-positif.png. That's fine for a normal <img> tag
// (the browser already has the session cookie from the page's own
// navigation), but html2canvas's useCORS:true option re-fetches every image
// it captures via a fresh cross-origin-mode request to read its pixels back
// out for the canvas — and that re-fetch got redirected to /login by this
// same-origin "protection", so the logo silently failed to load and
// rendered as blank in every exported PDF. None of these asset types are
// sensitive, so there's no reason to gate them behind a session at all.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpe?g|gif|webp|ico)$).*)"],
};
