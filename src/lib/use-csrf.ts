"use client"

import { useState, useEffect } from "react"

/**
 * React hook that fetches a CSRF token from the server on mount.
 *
 * Usage:
 *   const { csrfToken, loading, error } = useCsrf()
 *
 * The token is included as `x-csrf-token` header in mutating requests
 * (POST, PUT, PATCH, DELETE). The server validates it against a signed
 * httpOnly cookie set by the same endpoint.
 */
export function useCsrf() {
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    fetch("/api/csrf")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch CSRF token")
        return res.json()
      })
      .then((data) => {
        if (!cancelled) {
          setCsrfToken(data.csrfToken)
          setLoading(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message)
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { csrfToken, loading, error }
}
