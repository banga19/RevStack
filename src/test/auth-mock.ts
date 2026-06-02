import { vi } from "vitest"

/**
 * Shared auth mock for use in API route tests.
 *
 * Import and call at the top of your test file:
 *   import { mockAuth } from "@/test/auth-mock"
 *   mockAuth()
 *
 * This mocks @/lib/auth to return a valid admin session,
 * so route handlers with auth guards don't 401.
 */
export function mockAuth() {
  vi.mock("@/lib/auth", () => ({
    auth: vi.fn().mockResolvedValue({ user: { id: "test-user", role: "admin" } }),
    signIn: vi.fn(),
    signOut: vi.fn(),
    handlers: { GET: vi.fn(), POST: vi.fn() },
  }))
}
