import { defineConfig } from "drizzle-kit";
console.log("DATABASE_URL:", process.env.DATABASE_URL);
export default defineConfig({
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: { url: process.env.DATABASE_URL! },
});