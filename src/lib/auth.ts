/**
 * Clerk auth helper for RevStack (Mapato).
 *
 * Provides a server-side `auth()` function that returns the current session
 * in a shape compatible with the rest of the app (id, email, role, etc.).
 *
 * .env required:
 *   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
 *   CLERK_SECRET_KEY=
 *   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
 *   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/signup
 */

import { auth as clerkAuth } from "@clerk/nextjs/server"
import { prisma } from "@/lib/db"

export interface AuthSession {
  user: {
    id: string
    email?: string | null
    name?: string | null
    role?: string
    image?: string | null
  } | null
}

export async function auth(): Promise<AuthSession> {
  const { userId } = await clerkAuth()

  if (!userId) {
    return { user: null }
  }

  let dbUser: { id: string; role: string; name: string | null; email: string | null; image: string | null } | null = null
  try {
    dbUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, name: true, email: true, image: true },
    })
  } catch {
    dbUser = null
  }

  return {
    user: {
      id: userId,
      email: dbUser?.email ?? null,
      name: dbUser?.name ?? null,
      role: dbUser?.role ?? "user",
      image: dbUser?.image ?? null,
    },
  }
}
