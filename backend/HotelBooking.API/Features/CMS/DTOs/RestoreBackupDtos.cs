namespace HotelBooking.API.Features.CMS.DTOs;

public class RestoreBackupRequestDto
{
    public bool Confirm { get; set; } = false;
}

public class RestoreBackupResultDto
{
    public bool Success { get; set; }
    public bool RequiresConfirmation { get; set; }
    public string Message { get; set; } = string.Empty;
}
