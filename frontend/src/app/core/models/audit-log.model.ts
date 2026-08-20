/** Matches HotelBooking.API.Users.Models.AuditLog (curl-confirmed against GET /api/AdminAudit).
 *  ChangedByUser is the full User entity server-side (includes sensitive fields like
 *  passwordHash) — only the display-safe fields we actually use are modeled here. */
export interface AuditLog {
  id: number;
  entityName: string;
  entityId: number;
  action: string;
  changes: string;
  changedByUserId: number | null;
  changedByUser: AuditLogUserSummary | null;
  timestamp: string;
}

export interface AuditLogUserSummary {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}
