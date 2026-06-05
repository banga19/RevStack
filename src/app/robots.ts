/**
 * Dynamic Robots.txt
 *
 * Generates robots.txt that allows all crawlable routes while
 * blocking admin/internal paths. Reference the sitemap URL.
 */

import { MetadataRoute } from "next"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://mapato.app"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/login",
          "/signup",
          "/pricing",
          "/docs",
          "/privacy",
          "/terms",
          "/onboarding",
          "/needs-assessment",
          "/korea",
          "/korea/buyers",
          "/korea/inquiries",
          "/dashboard",
          "/operations",
          "/pipeline",
          "/trade",
          "/content",
          "/outreach",
          "/financial",
          "/plan",
        ],
        disallow: [
          "/admin",
          "/api/",
          "/_next/",
          "/messages",
          "/hermes",
          "/leads",
          "/followups",
          "/retainers",
          "/revstack",
          "/templates",
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
