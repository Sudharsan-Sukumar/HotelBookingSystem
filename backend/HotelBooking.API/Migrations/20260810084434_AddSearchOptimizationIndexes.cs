using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelBooking.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSearchOptimizationIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_RoomTypes_HotelId",
                schema: "hotel",
                table: "RoomTypes");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_HotelId",
                schema: "hotel",
                table: "Bookings");

            migrationBuilder.CreateIndex(
                name: "IX_RoomTypes_HotelId_IsActive",
                schema: "hotel",
                table: "RoomTypes",
                columns: new[] { "HotelId", "IsActive" });

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_HotelId_RoomTypeId_Status_CheckInDate_CheckOutDate",
                schema: "hotel",
                table: "Bookings",
                columns: new[] { "HotelId", "RoomTypeId", "Status", "CheckInDate", "CheckOutDate" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_RoomTypes_HotelId_IsActive",
                schema: "hotel",
                table: "RoomTypes");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_HotelId_RoomTypeId_Status_CheckInDate_CheckOutDate",
                schema: "hotel",
                table: "Bookings");

            migrationBuilder.CreateIndex(
                name: "IX_RoomTypes_HotelId",
                schema: "hotel",
                table: "RoomTypes",
                column: "HotelId");

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_HotelId",
                schema: "hotel",
                table: "Bookings",
                column: "HotelId");
        }
    }
}
