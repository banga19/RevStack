import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
export const leadsTable = sqliteTable("leads", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  industry: text("industry"),
  country: text("country"),
  status: text("status").notNull().default("new"),
  qualificationScore: integer("qualification_score"),
  notes: text("notes"),
  source: text("source"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().defaultNow().$onUpdate(() => new Date()),
});
export const insertLeadSchema = createInsertSchema(leadsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leadsTable.$inferSelect;