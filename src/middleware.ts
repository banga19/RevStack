import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl } = req
  const isLoggedIn = !!req.auth?.user
  const role = req.auth?.user?.role

  // Public routes — auth pages, needs-assessment, and API routes (which handle their own auth)
  const publicRoutes = ["/login", "/signup", "/needs-assessment", "/api", "/terms", "/privacy"]
  const isPublicRoute = publicRoutes.some((route) => nextUrl.pathname.startsWith(route))
  
  // Landing page is always public
  if (nextUrl.pathname === "/") {
    return NextResponse.next()
  }

  if (!isLoggedIn && !isPublicRoute) {
    // Redirect to login with callback URL
    const callbackUrl = nextUrl.pathname + nextUrl.search
    const encodedCallback = encodeURIComponent(callbackUrl)
    return NextResponse.redirect(new URL(`/login?callbackUrl=${encodedCallback}`, nextUrl))
  }

  // If logged in and on login/signup, redirect to dashboard
  if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", nextUrl))
  }

  // Admin routes require admin role
  if (isLoggedIn && (nextUrl.pathname === "/admin" || nextUrl.pathname.startsWith("/admin/"))) {
    if (role !== "admin") {
      return NextResponse.redirect(new URL("/dashboard", nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    // Match all routes except static files, _next, and favicon
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
}
