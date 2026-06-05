import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
export const clientsTable = sqliteTable("clients", {
  id: integer("id", { mode: "number" }).primaryKey({ autoIncrement: true }),
  companyName: text("company_name").notNull(),
  contactName: text("contact_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone"),
  whatsapp: text("whatsapp"),
  country: text("country"),
  industry: text("industry"),
  status: text("status").notNull().default("onboarding"),
  onboardingStep: integer("onboarding_step").notNull().default(1),
  onboardingNotes: text("onboarding_notes"),
  leadId: integer("lead_id"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().defaultNow(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull().defaultNow().$onUpdate(() => new Date()),
});
export const insertClientSchema = createInsertSchema(clientsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;