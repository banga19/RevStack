import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
export const messagesTable = sqliteTable("messages", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  channel: text("channel").notNull(),
  to: text("to").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("queued"),
  leadId: integer("lead_id"),
  clientId: integer("client_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});
export const insertMessageSchema = createInsertSchema(messagesTable).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messagesTable.$inferSelect;
