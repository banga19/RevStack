import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
export const activityTable = sqliteTable("activity", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  type: text("type").notNull(),
  description: text("description").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  userId: text("user_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
});
export const insertActivitySchema = createInsertSchema(activityTable).omit({ id: true, createdAt: true });
export type InsertActivity = z.infer<typeof insertActivitySchema>;
export type Activity = typeof activityTable.$inferSelect;
