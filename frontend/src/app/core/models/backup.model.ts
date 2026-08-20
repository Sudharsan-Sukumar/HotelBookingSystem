/** Matches HotelBooking.API.Features.CMS.Models.DatabaseBackup exactly (curl-confirmed
 *  against GET /api/DatabaseBackups and POST /api/DatabaseBackups/trigger). */
export interface DatabaseBackup {
  id: number;
  backupId: string;
  fileName: string;
  size: string;
  backupType: string; // 'Manual' | 'Auto'
  status: string; // 'Completed' | 'Failed'
  createdBy: string;
  createdAt: string;
  schemaVersion: string;
}
