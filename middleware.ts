import { NextRequest, NextResponse } from "next/server";
import { config as appConfig } from "@/lib/config";

// Middleware runs on the Edge runtime, where Node's `crypto` module isn't
// available — so this layer only checks that the *right* cookie is present
// and redirects to the matching login page if not. Full HMAC signature +
// expiry verification (lib/session.ts) happens again in every page/API route
// that actually reads the session, so a forged/expired cookie is still
// rejected server-side even if it slips past this quick check.
const GUARDS: { prefix: string; cookie: string; loginPath: string }[] = [
  { prefix: "/citizen", cookie: appConfig.cookies.citizen, loginPath: "/citizen/login" },
  { prefix: "/officer", cookie: appConfig.cookies.officer, loginPath: "/officer/login" },
  { prefix: "/admin", cookie: appConfig.cookies.admin, loginPath: "/admin/login" },
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  for (const guard of GUARDS) {
    const isLoginPage = pathname === guard.loginPath;
    if (pathname.startsWith(guard.prefix) && !isLoginPage) {
      const hasCookie = req.cookies.has(guard.cookie);
      if (!hasCookie) {
        const url = req.nextUrl.clone();
        url.pathname = guard.loginPath;
        url.searchParams.set("next", pathname);
        return NextResponse.redirect(url);
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/citizen/:path*", "/officer/:path*", "/admin/:path*"],
};
