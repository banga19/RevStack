// Re-export the NextAuth handler for the App Router.
// NextAuth v4 returns an async handler function — we export it as GET and POST.
export { GET, POST } from "@/lib/auth"
