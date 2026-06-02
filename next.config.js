/** @type {import('next').NextConfig} */
const nextConfig = {
  // Handle Node.js built-in modules for langchain packages
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Don't attempt to resolve these node modules on the client side
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
    }
    return config
  },
  // Ensure langchain packages run only on server
  serverExternalPackages: [
    "langchain",
    "@langchain/core",
    "@langchain/community",
    "@langchain/openai",
    "@langchain/langgraph",
  ],
}

module.exports = nextConfig
