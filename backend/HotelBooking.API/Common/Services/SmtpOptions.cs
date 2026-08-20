namespace HotelBooking.API.Common.Services;

// Options Pattern — strongly-typed target bound from the "Smtp" config section via IOptions<T>.
// Values come from User Secrets (dev) or environment variables — never from appsettings.json,
// so the real SMTP login/password/API key never enters source control.
public class SmtpOptions
{
    public const string SectionName = "Smtp";

    public string Host { get; set; } = string.Empty;
    public int Port { get; set; } = 587;
    public string Login { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string FromEmail { get; set; } = string.Empty;
    public string FromName { get; set; } = string.Empty;
}
