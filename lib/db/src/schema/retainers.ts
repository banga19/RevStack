import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
export const retainersTable = sqliteTable("retainers", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  clientId: integer("client_id").notNull(),
  name: text("name").notNull(),
  amountUsd: integer("amount_usd").notNull(),
  billingCycle: text("billing_cycle").notNull().default("monthly"),
  status: text("status").notNull().default("active"),
  startDate: text("start_date").notNull(),
  nextBillingDate: text("next_billing_date"),
  notes: text("notes"),
  userId: integer("user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().defaultNow().$onUpdate(() => new Date()),
});
export const insertRetainerSchema = createInsertSchema(retainersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRetainer = z.infer<typeof insertRetainerSchema>;
export type Retainer = typeof retainersTable.$inferSelect;
