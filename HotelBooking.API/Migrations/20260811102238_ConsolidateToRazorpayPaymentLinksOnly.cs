using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelBooking.API.Migrations
{
    /// <inheritdoc />
    public partial class ConsolidateToRazorpayPaymentLinksOnly : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "RazorpayOrderId",
                schema: "hotel",
                table: "RazorpayPayments");

            migrationBuilder.AddColumn<string>(
                name: "PaymentMethod",
                schema: "hotel",
                table: "RazorpayPayments",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "WalletAmountApplied",
                schema: "hotel",
                table: "RazorpayPayments",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PaymentMethod",
                schema: "hotel",
                table: "RazorpayPayments");

            migrationBuilder.DropColumn(
                name: "WalletAmountApplied",
                schema: "hotel",
                table: "RazorpayPayments");

            migrationBuilder.AddColumn<string>(
                name: "RazorpayOrderId",
                schema: "hotel",
                table: "RazorpayPayments",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
