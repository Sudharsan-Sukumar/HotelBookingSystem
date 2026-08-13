namespace HotelBooking.API.Common.Constants;

public static class ValidationRegexConstants
{
    // Personal Information
    public const string Name = @"^[a-zA-Z\s\.\-]{2,80}$";
    public const string LastName = @"^[a-zA-Z\s\.\-]{1,80}$";
    public const string Email = @"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$";
    public const string PhoneIndia = @"^[6-9]\d{9}$";
    
    // Passwords & Security
    public const string Password = @"^(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,}$";
    public const string Otp = @"^\d{6}$";

    // Hotel & Booking Info
    public const string SafeText = @"^[^<>{}]+$";
    public const string AlphaNumericWithSpaces = @"^[a-zA-Z0-9\s\&\'\-\,]{3,100}$";
    public const string PinCodeIndia = @"^[1-9][0-9]{5}$";

    // Payments
    public const string PaymentMethod = @"^(Credit Card|Debit Card|Net Banking|UPI)$";
}
