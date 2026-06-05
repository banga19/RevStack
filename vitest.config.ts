import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "lib/db/**/*.test.{ts,tsx}"],
    server: {
      deps: {
        inline: ["next-auth"],
      },
    },
    exclude: ["**/lib/db/src/schema/__tests__/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})
