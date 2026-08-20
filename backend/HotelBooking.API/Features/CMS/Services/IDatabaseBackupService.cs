using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Features.CMS.DTOs;
using HotelBooking.API.Features.CMS.Models;

namespace HotelBooking.API.Features.CMS.Services;

public interface IDatabaseBackupService
{
    Task<IEnumerable<DatabaseBackup>> GetAllBackupsAsync();
    Task<DatabaseBackup> TriggerManualBackupAsync(string adminEmail);
    Task<RestoreBackupResultDto> RestoreBackupAsync(int backupId, bool confirm);
}
