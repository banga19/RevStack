/** @type {import('next').NextConfig} */
const nextConfig = {
  /*
   * ── Webpack config (Node.js polyfills for client-side) ──────────
   *
   * Turbopack does not support `resolve.fallback`, so we keep the
   * `--webpack` flag in the dev script. The polyfills below prevent
   * client-side bundling errors when a server-only package (langchain)
   * is inadvertently pulled into browser bundles.
   *
   * When/if Turbopack gains native support for Node.js module stubs,
   * this webpack block and the `--webpack` flag can be removed.
   */
  webpack: (config, { isServer }) => {
    // Follow symlinks (not needed for npm, but harmless)
    config.resolve.symlinks = false

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
        stream: false,
        http: false,
        https: false,
        zlib: false,
        url: false,
        util: false,
        assert: false,
        buffer: false,
        net: false,
        tls: false,
        child_process: false,
        "node:fs": false,
        "node:path": false,
        "node:fs/promises": false,
        "node:crypto": false,
        "node:stream": false,
        "node:http": false,
        "node:https": false,
        "node:zlib": false,
        "node:url": false,
        "node:util": false,
        "node:assert": false,
        "node:buffer": false,
        "node:net": false,
        "node:tls": false,
        "node:os": false,
        "node:string_decoder": false,
        "node:querystring": false,
        "node:events": false,
        "node:timers": false,
        "node:module": false,
      }
      config.resolve.alias = {
        ...config.resolve.alias,
        "@prisma/client/index-browser": false,
        "@prisma/client/runtime/index-browser": false,
      }
    }
    return config
  },

  /*
   * ── Turbopack config (used only when running without --webpack) ─
   *
   * Empty config signals to Next.js 16 that we acknowledge Turbopack,
   * preventing the build error about a missing turbopack config.
   * The webpack block above is still the primary bundler (via --webpack).
   */
  turbopack: {},

  // PWA: Service Worker must be served with correct Content-Type
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Content-Type",
            value: "application/javascript; charset=utf-8",
          },
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          {
            key: "Content-Type",
            value: "application/json; charset=utf-8",
          },
        ],
      },
    ]
  },

  // Ensure langchain packages run only on server
  serverExternalPackages: [
    "langchain",
    "@langchain/core",
    "@langchain/community",
    "@langchain/openai",
    "@langchain/langgraph",
    "@prisma/client",
  ],
}

module.exports = nextConfig
