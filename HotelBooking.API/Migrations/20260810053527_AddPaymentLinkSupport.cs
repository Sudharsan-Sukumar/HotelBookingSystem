using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelBooking.API.Migrations
{
    /// <inheritdoc />
    public partial class AddPaymentLinkSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "PaymentLinkUrl",
                schema: "hotel",
                table: "RazorpayPayments",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "RazorpayPaymentLinkId",
                schema: "hotel",
                table: "RazorpayPayments",
                type: "nvarchar(max)",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PaymentLinkUrl",
                schema: "hotel",
                table: "RazorpayPayments");

            migrationBuilder.DropColumn(
                name: "RazorpayPaymentLinkId",
                schema: "hotel",
                table: "RazorpayPayments");
        }
    }
}
