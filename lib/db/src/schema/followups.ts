import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
export const followupsTable = sqliteTable("followups", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  leadId: integer("lead_id"),
  clientId: integer("client_id"),
  channel: text("channel").notNull().default("whatsapp"),
  messageBody: text("message_body").notNull(),
  status: text("status").notNull().default("pending"),
  scheduledAt: integer("scheduled_at", { mode: "timestamp" }).notNull().defaultNow(),
  sentAt: integer("sent_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});
export const insertFollowupSchema = createInsertSchema(followupsTable).omit({ id: true, createdAt: true });
export type InsertFollowup = z.infer<typeof insertFollowupSchema>;
export type Followup = typeof followupsTable.$inferSelect;
