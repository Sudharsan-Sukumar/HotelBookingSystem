using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelBooking.API.Migrations
{
    /// <inheritdoc />
    public partial class AddSecurityAuditAndBookingStatusTrigger : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "BookingStatusHistory",
                schema: "hotel",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    BookingId = table.Column<int>(type: "int", nullable: false),
                    OldStatus = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    NewStatus = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    ChangedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_BookingStatusHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_BookingStatusHistory_Bookings_BookingId",
                        column: x => x.BookingId,
                        principalSchema: "hotel",
                        principalTable: "Bookings",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SecurityAuditLogs",
                schema: "hotel",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    EventType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: true),
                    UserId = table.Column<int>(type: "int", nullable: true),
                    Success = table.Column<bool>(type: "bit", nullable: false),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    IpAddress = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    CorrelationId = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: true),
                    Timestamp = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SecurityAuditLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SecurityAuditLogs_Users_UserId",
                        column: x => x.UserId,
                        principalSchema: "hotel",
                        principalTable: "Users",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_BookingStatusHistory_BookingId",
                schema: "hotel",
                table: "BookingStatusHistory",
                column: "BookingId");

            migrationBuilder.CreateIndex(
                name: "IX_SecurityAuditLogs_EventType_Timestamp",
                schema: "hotel",
                table: "SecurityAuditLogs",
                columns: new[] { "EventType", "Timestamp" });

            migrationBuilder.CreateIndex(
                name: "IX_SecurityAuditLogs_Timestamp",
                schema: "hotel",
                table: "SecurityAuditLogs",
                column: "Timestamp");

            migrationBuilder.CreateIndex(
                name: "IX_SecurityAuditLogs_UserId",
                schema: "hotel",
                table: "SecurityAuditLogs",
                column: "UserId");

            // Event-Driven Database Trigger — fires on every UPDATE to hotel.Bookings and inserts one
            // BookingStatusHistory row per booking whose Status column actually changed. This is a
            // deliberately narrow use of a trigger (see class remarks on BookingStatusHistory):
            //   - It captures ONLY the fact "Status changed from X to Y at time T", nothing else —
            //     no business rules, no refund/notification logic, none of that stays in the
            //     application layer (BookingService/AuditLogService) where it belongs.
            //   - UPDATE(Status) short-circuits the trigger body entirely when a Status-unrelated
            //     column changes (e.g. RowVersion-only concurrency touches), so it doesn't add
            //     overhead to updates that never touch Status.
            //   - The INSERT reads from the pseudo-tables "inserted"/"deleted" joined on Id, which
            //     correctly handles multi-row UPDATE statements (e.g. a hypothetical bulk status
            //     change) — it is NOT written assuming a single-row update.
            //   - It only inserts into BookingStatusHistory, a table this trigger owns exclusively —
            //     it never writes back to Bookings itself, so there is no risk of it re-firing itself
            //     (no recursive trigger invocation possible).
            migrationBuilder.Sql(@"
CREATE TRIGGER hotel.trg_Booking_StatusChange
ON hotel.Bookings
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF UPDATE(Status)
    BEGIN
        INSERT INTO hotel.BookingStatusHistory (BookingId, OldStatus, NewStatus, ChangedAt)
        SELECT d.Id, d.Status, i.Status, SYSUTCDATETIME()
        FROM inserted i
        INNER JOIN deleted d ON d.Id = i.Id
        WHERE i.Status <> d.Status;
    END
END
");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TRIGGER IF EXISTS hotel.trg_Booking_StatusChange;");

            migrationBuilder.DropTable(
                name: "BookingStatusHistory",
                schema: "hotel");

            migrationBuilder.DropTable(
                name: "SecurityAuditLogs",
                schema: "hotel");
        }
    }
}
