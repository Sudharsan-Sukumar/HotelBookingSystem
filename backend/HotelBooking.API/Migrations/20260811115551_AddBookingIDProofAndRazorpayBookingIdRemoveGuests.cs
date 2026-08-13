using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelBooking.API.Migrations
{
    /// <inheritdoc />
    public partial class AddBookingIDProofAndRazorpayBookingIdRemoveGuests : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Guests",
                schema: "hotel");

            migrationBuilder.AddColumn<int>(
                name: "BookingId",
                schema: "hotel",
                table: "RazorpayPayments",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "IDProofNumber",
                schema: "hotel",
                table: "Bookings",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "IDProofType",
                schema: "hotel",
                table: "Bookings",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "BookingId",
                schema: "hotel",
                table: "RazorpayPayments");

            migrationBuilder.DropColumn(
                name: "IDProofNumber",
                schema: "hotel",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "IDProofType",
                schema: "hotel",
                table: "Bookings");

            migrationBuilder.CreateTable(
                name: "Guests",
                schema: "hotel",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BookingId = table.Column<int>(type: "int", nullable: false),
                    Age = table.Column<int>(type: "int", nullable: false),
                    FirstName = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IDProofNumber = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IDProofType = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    LastName = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Guests", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Guests_Bookings_BookingId",
                        column: x => x.BookingId,
                        principalSchema: "hotel",
                        principalTable: "Bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Guests_BookingId",
                schema: "hotel",
                table: "Guests",
                column: "BookingId");
        }
    }
}
