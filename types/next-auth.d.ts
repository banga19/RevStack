import { DefaultSession, DefaultUser } from "@auth/core/types"

declare module "@auth/core/types" {
  interface User {
    role?: string
  }

  interface Session {
    user: {
      role?: string
    } & DefaultSession["user"]
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    role?: string
  }
}
