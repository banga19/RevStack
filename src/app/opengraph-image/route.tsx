/**
 * Dynamic Open Graph Image Generation
 *
 * Generates a PNG image for social media previews (Slack, Twitter/X, WhatsApp, LinkedIn).
 * This image appears when sharing Mapato links on social platforms.
 *
 * Next.js statically analyzes this file to serve /opengraph-image.
 * Uses the edge runtime for fast image generation.
 *
 * Brand colors: primary=#7C3AED (violet), accent=#F5B920 (amber/gold)
 */

import { ImageResponse } from "next/og"

export const runtime = "edge"

export const alt = "Mapato — AI-Powered B2B Trade Automation Platform"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

export default async function GET() {
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
          fontFamily: "system-ui, sans-serif",
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
            backgroundImage:
              "radial-gradient(circle at 25px 25px, rgba(255,255,255,0.05) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
          }}
        />

        {/* Glow accents */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.2) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(245,185,32,0.15) 0%, transparent 70%)",
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
              background: "linear-gradient(135deg, #7C3AED, #A78BFA)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 20,
              fontWeight: 700,
            }}
          >
            M
          </div>
          <span style={{ fontSize: 24, fontWeight: 600, color: "#c7d2fe" }}>
            Mapato
          </span>
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
              fontSize: 60,
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: 16,
              background: "linear-gradient(135deg, #ffffff, #A78BFA, #F5B920)",
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
              marginBottom: 24,
            }}
          >
            AI-powered B2B trade automation platform
          </p>

          {/* Feature badges */}
          <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center" }}>
            {[
              "🤖 AI Lead Qualification",
              "📱 WhatsApp Automation",
              "🌍 Korea-Africa Corridor",
              "🛡️ Compliance Tracking",
            ].map((text) => (
              <div
                key={text}
                style={{
                  padding: "8px 20px",
                  borderRadius: 999,
                  background: "rgba(124,58,237,0.2)",
                  border: "1px solid rgba(124,58,237,0.3)",
                  fontSize: 16,
                  color: "#c7d2fe",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                {text}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
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
          <span>AI-Powered B2B Trade · Korea-Africa Corridor</span>
          <span>14-Day Free Trial</span>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
