using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelBooking.API.Migrations
{
    /// <inheritdoc />
    public partial class WidenBookingIDProofNumberForBCryptHash : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Bookings.IDProofNumber now stores a BCrypt hash (always 60 chars) instead of the raw
            // Aadhaar/PAN/Passport/etc. number, so the old 50-char width is too small. Existing rows
            // are left untouched here — they still hold their original plain-text value; only new
            // bookings created from now on are hashed at write time (see BookingService.HashIdProofNumber).
            migrationBuilder.AlterColumn<string>(
                name: "IDProofNumber",
                schema: "hotel",
                table: "Bookings",
                type: "nvarchar(255)",
                maxLength: 255,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(50)",
                oldMaxLength: 50);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterColumn<string>(
                name: "IDProofNumber",
                schema: "hotel",
                table: "Bookings",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(255)",
                oldMaxLength: 255);
        }
    }
}
