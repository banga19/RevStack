/**
 * Dynamic Open Graph Image Generation
 *
 * Generates a PNG image for social media previews (Slack, Twitter, WhatsApp, LinkedIn).
 * Next.js statically analyzes this file to serve /opengraph-image.
 *
 * To customize the design, edit the JSX below.
 * For a simpler static OG image, replace with a static file at /public/og-image.png
 */

import { ImageResponse } from "next/og"

export const runtime = "edge"
export const contentType = "image/png"
export const size = { width: 1200, height: 630 }

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #1e40af 100%)",
          color: "white",
          fontFamily: "sans-serif",
          padding: "60px 80px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Decorative grid pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "radial-gradient(circle at 25px 25px, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        {/* Logo area */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 60,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            M
          </div>
          <span style={{ fontSize: 24, fontWeight: 600, color: "#c7d2fe" }}>Mapato</span>
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            maxWidth: 900,
            zIndex: 1,
          }}
        >
          <h1
            style={{
              fontSize: 56,
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: 16,
              background: "linear-gradient(135deg, #ffffff, #a5b4fc)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Mapato — AI Revenue Operations
          </h1>
          <p
            style={{
              fontSize: 28,
              color: "#c7d2fe",
              lineHeight: 1.4,
              margin: 0,
            }}
          >
            AI-powered B2B trade automation platform
          </p>
        </div>

        {/* Bottom tagline */}
        <div
          style={{
            position: "absolute",
            bottom: 40,
            left: 60,
            right: 60,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 16,
            color: "#6366f1",
            borderTop: "1px solid rgba(99,102,241,0.3)",
            paddingTop: 20,
          }}
        >
          <span>mapato.app</span>
          <span>AI-Powered B2B Trade</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
