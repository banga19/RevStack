/**
 * NextAuth v4 configuration for RevStack (Mapato).
 *
 * NOTE: next-auth v4's `NextAuth()` returns an async handler function directly,
 * NOT an object with `{ handlers, auth, signIn, signOut }` as in v5.
 * We export { GET, POST } for the App Router route handler and provide
 * a convenience `auth()` function using `getServerSession`.
 */

import NextAuth from "next-auth"
import { getServerSession } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

// Server-side analytics logging for auth events
function logEvent(event: string, data: Record<string, any>) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[Analytics] ${event}:`, data)
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Auth configuration (shared between handler and getServerSession)
// ═══════════════════════════════════════════════════════════════════════════

const authOptions = {
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid email or password")
        }

        const email = credentials.email as string
        const password = credentials.password as string

        const user = await prisma.user.findUnique({
          where: { email },
        })

        if (!user) {
          throw new Error("Invalid email or password")
        }

        const isValid = await bcrypt.compare(password, user.password)
        if (!isValid) {
          throw new Error("Invalid email or password")
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
    // Google SSO provider - configure GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [Google({
          clientId: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        })]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Track login event for retention analytics
      if (account?.provider === "credentials") {
        logEvent("login", { email: user.email, method: "credentials" })
      }

      // For Google SSO, create or link user account
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        })

        if (!existingUser) {
          // Auto-create account for Google users with 3-day trial
          const now = new Date()
          const trialEnd = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
          await prisma.user.create({
            data: {
              name: user.name || "Google User",
              email: user.email!,
              password: "",
              role: "user",
              image: user.image,
              termsAccepted: true,
              termsAcceptedAt: now,
              termsVersion: "1.0",
              // 3-day free trial with full access
              trialStartsAt: now,
              trialEndsAt: trialEnd,
              subscriptionStatus: "trial",
              subscriptionTier: "enterprise",
              subscriptionPlan: "monthly",
            },
          })
          logEvent("signup", { email: user.email, method: "google" })
        } else {
          logEvent("login", { email: user.email, method: "google" })
          // Update profile image and login timestamp for retention tracking
          await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              image: user.image || existingUser.image,
            },
          })
        }
      }

      // Update lastLoginAt on every successful login (both credentials and Google)
      if (user.email) {
        await prisma.user.updateMany({
          where: { email: user.email },
          data: { lastLoginAt: new Date() },
        })
      }

      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      // For Google sign-ins, fetch user from DB to get role
      if (account?.provider === "google" && token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email as string },
        })
        if (dbUser) {
          token.id = dbUser.id
          token.role = dbUser.role
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
}

// ═══════════════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════════════

// next-auth v4: NextAuth(options) returns an async handler function
const handler = NextAuth(authOptions)

// For App Router route handler (app/api/auth/[...nextauth]/route.ts)
export { handler as GET, handler as POST }

// Server-side session helper (wraps getServerSession for convenience).
// In next-auth v4, we use getServerSession() with the auth options.
export async function auth() {
  return getServerSession(authOptions)
}
