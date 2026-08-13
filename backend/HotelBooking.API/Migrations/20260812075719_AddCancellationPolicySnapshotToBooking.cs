using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelBooking.API.Migrations
{
    /// <inheritdoc />
    public partial class AddCancellationPolicySnapshotToBooking : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Existing rows predate this policy-snapshot concept — backfill them with the exact
            // 48h/24h/50% thresholds that were hardcoded in BookingService before this migration,
            // so a pre-existing booking's cancellation math doesn't change under it.
            migrationBuilder.AddColumn<double>(
                name: "FullRefundHoursThreshold",
                schema: "hotel",
                table: "Bookings",
                type: "float",
                nullable: false,
                defaultValue: 48.0);

            migrationBuilder.AddColumn<double>(
                name: "PartialRefundHoursThreshold",
                schema: "hotel",
                table: "Bookings",
                type: "float",
                nullable: false,
                defaultValue: 24.0);

            migrationBuilder.AddColumn<decimal>(
                name: "PartialRefundPercentage",
                schema: "hotel",
                table: "Bookings",
                type: "decimal(5,4)",
                nullable: false,
                defaultValue: 0.5m);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FullRefundHoursThreshold",
                schema: "hotel",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "PartialRefundHoursThreshold",
                schema: "hotel",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "PartialRefundPercentage",
                schema: "hotel",
                table: "Bookings");
        }
    }
}
