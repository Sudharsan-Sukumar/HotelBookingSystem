using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelBooking.API.Migrations
{
    /// <inheritdoc />
    public partial class AddRowVersionForConcurrency : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Reviews_BookingId",
                schema: "hotel",
                table: "Reviews");

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                schema: "hotel",
                table: "RoomTypes",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_BookingId_CustomerId",
                schema: "hotel",
                table: "Reviews",
                columns: new[] { "BookingId", "CustomerId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_Reviews_BookingId_CustomerId",
                schema: "hotel",
                table: "Reviews");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                schema: "hotel",
                table: "RoomTypes");

            migrationBuilder.CreateIndex(
                name: "IX_Reviews_BookingId",
                schema: "hotel",
                table: "Reviews",
                column: "BookingId");
        }
    }
}
