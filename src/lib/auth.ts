import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { prisma } from "@/lib/db"

export const { handlers, signIn, signOut, auth } = NextAuth({
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

        const bcrypt = await import("bcryptjs").then((m) => m.default || m)
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
      // For Google SSO, create or link user account
      if (account?.provider === "google") {
        const existingUser = await prisma.user.findUnique({
          where: { email: user.email! },
        })

        if (!existingUser) {
          // Auto-create account for Google users
          await prisma.user.create({
            data: {
              name: user.name || "Google User",
              email: user.email!,
              password: "", // No password for Google-authenticated users
              role: "user",
              image: user.image,
            },
          })
        } else if (!existingUser.image && user.image) {
          // Update profile image if not set
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { image: user.image },
          })
        }
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
  trustHost: true,
})
