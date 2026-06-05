import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
export const hermesRunsTable = sqliteTable("hermes_runs", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  taskType: text("task_type").notNull(),
  status: text("status").notNull().default("pending"),
  input: text("input"),
  output: text("output"),
  errorMessage: text("error_message"),
  leadsProcessed: integer("leads_processed"),
  messagesQueued: integer("messages_queued"),
  userId: text("user_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});
export const insertHermesRunSchema = createInsertSchema(hermesRunsTable).omit({ id: true, createdAt: true });
export type InsertHermesRun = z.infer<typeof insertHermesRunSchema>;
export type HermesRun = typeof hermesRunsTable.$inferSelect;
