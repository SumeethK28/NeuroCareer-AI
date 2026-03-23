import { type NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("access_token")?.value;
  const { pathname } = request.nextUrl;

  // Allow all /api/auth routes to pass through to backend (don't intercept)
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Allow unauthenticated access to static/next assets
  if (pathname.startsWith("/_next") || pathname.startsWith("/static")) {
    return NextResponse.next();
  }

  // If trying to access / without token, show auth page via query param
  if (pathname === "/" && !token) {
    return NextResponse.rewrite(new URL("/?view=auth", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|static).*)"],
};
