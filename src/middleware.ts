// src/middleware.ts  (place at root of src/)

import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    const isOnboarding = pathname === "/onboarding";
    const isApi        = pathname.startsWith("/api");

    // If logged in but profile NOT complete → send to onboarding
    // (never redirect if already there — prevents loop)
    if (token && !token.isProfileComplete && !isOnboarding && !isApi) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }

    // If profile IS complete and user tries to visit onboarding → dashboard
    if (token && token.isProfileComplete && isOnboarding) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding",
    "/create-group/:path*",
    "/family-profile/:path*",
    "/family-tree/:path*",
  ],
};