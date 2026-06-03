import { handlers } from "@/lib/auth"
import { NextRequest } from "next/server"

export const { GET, POST } = handlers

export function OPTIONS() {
  return new Response(null, { status: 204 })
}

export async function HEAD() {
  return handlers.GET(new NextRequest("http://localhost:3000"))
}
