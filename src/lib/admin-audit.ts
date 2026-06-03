/**
 * Admin Audit Log — tracks admin actions on user accounts (grant access, extend trial, etc.)
 */
import { prisma } from "@/lib/db"

export interface AuditLogEntry {
  adminId: string
  adminName?: string | null
  action: "grant_permanent_access" | "extend_trial" | "change_role"
  targetUserId?: string | null
  targetEmail?: string | null
  details?: string | null
}

/**
 * Log an admin action to the AdminAuditLog table.
 * Fire-and-forget — never throws.
 */
export async function logAdminAction(entry: AuditLogEntry): Promise<void> {
  try {
    await prisma.adminAuditLog.create({
      data: {
        adminId: entry.adminId,
        adminName: entry.adminName || null,
        action: entry.action,
        targetUserId: entry.targetUserId || null,
        targetEmail: entry.targetEmail || null,
        details: entry.details || null,
      },
    })
  } catch (error) {
    console.error("[AdminAudit] Failed to log action:", error)
  }
}
