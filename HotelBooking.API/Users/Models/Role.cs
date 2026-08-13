using System.ComponentModel.DataAnnotations.Schema;

namespace HotelBooking.API.Users.Models;

[Table("Roles", Schema = "hotel")]
public class Role
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
}
