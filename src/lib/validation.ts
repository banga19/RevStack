import { z } from "zod"

export const SignupSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  phone: z.string().optional(),
  termsAccepted: z.boolean().refine((v) => v === true, "Terms must be accepted"),
  organizationName: z.string().optional(),
  industry: z.string().optional(),
  referralCode: z.string().optional(),
})

export const TradeFinanceApplicationSchema = z.object({
  program: z.enum(["afdb-afawa", "sokogate-pay-escrow", "letter-of-credit", "export-credit", "other"]),
  amount: z.number().positive("Amount must be positive"),
  currency: z.string().length(3).default("USD"),
  status: z.enum(["draft", "submitted", "under-review", "approved", "disbursed", "rejected"]).optional(),
  clientId: z.string().min(1, "clientId is required"),
  notes: z.string().optional(),
})
