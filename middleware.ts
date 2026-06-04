/**
 * Middleware — re-exports the handler from proxy.ts.
 *
 * The `config` matcher MUST be defined directly in this file because
 * Next.js requires it to be statically analyzable (it can't be re-exported).
 * The handler function is re-exported from proxy.ts for cleanliness.
 */
export { default } from "./proxy"

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|_next/data|favicon.ico|manifest.json|sw.js).*)",
  ],
}

