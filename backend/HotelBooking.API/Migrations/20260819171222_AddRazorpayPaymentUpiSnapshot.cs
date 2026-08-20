using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelBooking.API.Migrations
{
    /// <inheritdoc />
    public partial class AddRazorpayPaymentUpiSnapshot : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsUpiEnabledSnapshot",
                schema: "hotel",
                table: "RazorpayPayments",
                type: "bit",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsUpiEnabledSnapshot",
                schema: "hotel",
                table: "RazorpayPayments");
        }
    }
}
