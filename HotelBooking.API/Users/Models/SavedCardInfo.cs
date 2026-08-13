using System;

namespace HotelBooking.API.Users.Models;

// Owned JSON element stored inside User.SavedCards — replaces the former standalone SavedCards
// table. Only tokenized/display-safe card metadata is kept here (never a raw PAN, CVV, or PIN) —
// matches what the existing payment integration needs to show a saved card, not process one.
public class SavedCardInfo
{
    public int Id { get; set; }
    public string CardType { get; set; } = string.Empty;
    public string Last4Digits { get; set; } = string.Empty;
    public string ExpiryDate { get; set; } = string.Empty;
    public string CardholderName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
