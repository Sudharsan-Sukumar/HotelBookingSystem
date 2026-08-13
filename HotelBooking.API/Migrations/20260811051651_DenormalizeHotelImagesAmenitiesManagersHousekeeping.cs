using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelBooking.API.Migrations
{
    /// <inheritdoc />
    public partial class DenormalizeHotelImagesAmenitiesManagersHousekeeping : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // 1. Add the new JSON columns first so the data-copy step below has somewhere to write.
            migrationBuilder.AddColumn<string>(
                name: "Amenities",
                schema: "hotel",
                table: "Hotels",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "Housekeeping",
                schema: "hotel",
                table: "Hotels",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "Images",
                schema: "hotel",
                table: "Hotels",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");

            migrationBuilder.AddColumn<string>(
                name: "ManagerIds",
                schema: "hotel",
                table: "Hotels",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "[]");

            // 2. Copy existing relational data into the new JSON columns before the source tables are dropped.
            migrationBuilder.Sql(@"
UPDATE h SET h.ManagerIds = '[' + ISNULL((
    SELECT STRING_AGG(CAST(hm.UserId AS NVARCHAR(20)), ',')
    FROM hotel.HotelManagers hm WHERE hm.HotelId = h.Id
), '') + ']'
FROM hotel.Hotels h;
");

            migrationBuilder.Sql(@"
UPDATE h SET h.Images = '[' + ISNULL((
    SELECT STRING_AGG(
        '{""Id"":' + CAST(hi.Id AS NVARCHAR(20)) +
        ',""Url"":""' + STRING_ESCAPE(hi.Url, 'json') + '""' +
        ',""Caption"":""' + STRING_ESCAPE(ISNULL(hi.Caption, ''), 'json') + '""' +
        ',""FileHash"":""' + STRING_ESCAPE(ISNULL(hi.FileHash, ''), 'json') + '""' +
        ',""IsPrimary"":' + CASE WHEN hi.IsPrimary = 1 THEN 'true' ELSE 'false' END +
        ',""UploadedAt"":""' + CONVERT(NVARCHAR(33), hi.UploadedAt, 126) + '""}'
    , ',')
    FROM hotel.HotelImages hi WHERE hi.HotelId = h.Id
), '') + ']'
FROM hotel.Hotels h;
");

            migrationBuilder.Sql(@"
UPDATE h SET h.Amenities = '[' + ISNULL((
    SELECT STRING_AGG('""' + STRING_ESCAPE(a.Name, 'json') + '""', ',')
    FROM hotel.HotelAmenities ha JOIN hotel.Amenities a ON a.Id = ha.AmenityId
    WHERE ha.HotelId = h.Id
), '') + ']'
FROM hotel.Hotels h;
");

            migrationBuilder.Sql(@"
UPDATE h SET h.Housekeeping = '[' + ISNULL((
    SELECT STRING_AGG(
        '{""Id"":' + CAST(ht.Id AS NVARCHAR(20)) +
        ',""RoomId"":' + CAST(ht.RoomId AS NVARCHAR(20)) +
        ',""AssignedTo"":' + CAST(ht.AssignedTo AS NVARCHAR(20)) +
        ',""TaskDescription"":""' + STRING_ESCAPE(ISNULL(ht.TaskDescription, ''), 'json') + '""' +
        ',""Status"":""' + STRING_ESCAPE(ISNULL(ht.Status, ''), 'json') + '""' +
        ',""DueDate"":""' + CONVERT(NVARCHAR(33), ht.DueDate, 126) + '""}'
    , ',')
    FROM hotel.HousekeepingTasks ht
    JOIN hotel.Rooms r ON r.Id = ht.RoomId
    WHERE r.HotelId = h.Id
), '') + ']'
FROM hotel.Hotels h;
");

            // 3. Now safe to drop the old relational tables — their data has been migrated above.
            migrationBuilder.DropTable(
                name: "HotelAmenities",
                schema: "hotel");

            migrationBuilder.DropTable(
                name: "HotelImages",
                schema: "hotel");

            migrationBuilder.DropTable(
                name: "HotelManagers",
                schema: "hotel");

            migrationBuilder.DropTable(
                name: "HousekeepingTasks",
                schema: "hotel");

            migrationBuilder.DropTable(
                name: "Amenities",
                schema: "hotel");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Amenities",
                schema: "hotel",
                table: "Hotels");

            migrationBuilder.DropColumn(
                name: "Housekeeping",
                schema: "hotel",
                table: "Hotels");

            migrationBuilder.DropColumn(
                name: "Images",
                schema: "hotel",
                table: "Hotels");

            migrationBuilder.DropColumn(
                name: "ManagerIds",
                schema: "hotel",
                table: "Hotels");

            migrationBuilder.CreateTable(
                name: "Amenities",
                schema: "hotel",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    IconUrl = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Amenities", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "HotelImages",
                schema: "hotel",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    HotelId = table.Column<int>(type: "int", nullable: false),
                    Caption = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FileHash = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsPrimary = table.Column<bool>(type: "bit", nullable: false),
                    UploadedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Url = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HotelImages", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HotelImages_Hotels_HotelId",
                        column: x => x.HotelId,
                        principalSchema: "hotel",
                        principalTable: "Hotels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "HotelManagers",
                schema: "hotel",
                columns: table => new
                {
                    HotelId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HotelManagers", x => new { x.HotelId, x.UserId });
                    table.ForeignKey(
                        name: "FK_HotelManagers_Hotels_HotelId",
                        column: x => x.HotelId,
                        principalSchema: "hotel",
                        principalTable: "Hotels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HotelManagers_Users_UserId",
                        column: x => x.UserId,
                        principalSchema: "hotel",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "HousekeepingTasks",
                schema: "hotel",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    AssignedTo = table.Column<int>(type: "int", nullable: false),
                    RoomId = table.Column<int>(type: "int", nullable: false),
                    DueDate = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Status = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    TaskDescription = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HousekeepingTasks", x => x.Id);
                    table.ForeignKey(
                        name: "FK_HousekeepingTasks_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalSchema: "hotel",
                        principalTable: "Rooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HousekeepingTasks_Users_AssignedTo",
                        column: x => x.AssignedTo,
                        principalSchema: "hotel",
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "HotelAmenities",
                schema: "hotel",
                columns: table => new
                {
                    HotelId = table.Column<int>(type: "int", nullable: false),
                    AmenityId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_HotelAmenities", x => new { x.HotelId, x.AmenityId });
                    table.ForeignKey(
                        name: "FK_HotelAmenities_Amenities_AmenityId",
                        column: x => x.AmenityId,
                        principalSchema: "hotel",
                        principalTable: "Amenities",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_HotelAmenities_Hotels_HotelId",
                        column: x => x.HotelId,
                        principalSchema: "hotel",
                        principalTable: "Hotels",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_HotelAmenities_AmenityId",
                schema: "hotel",
                table: "HotelAmenities",
                column: "AmenityId");

            migrationBuilder.CreateIndex(
                name: "IX_HotelImages_HotelId",
                schema: "hotel",
                table: "HotelImages",
                column: "HotelId");

            migrationBuilder.CreateIndex(
                name: "IX_HotelManagers_UserId",
                schema: "hotel",
                table: "HotelManagers",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_HousekeepingTasks_AssignedTo",
                schema: "hotel",
                table: "HousekeepingTasks",
                column: "AssignedTo");

            migrationBuilder.CreateIndex(
                name: "IX_HousekeepingTasks_RoomId",
                schema: "hotel",
                table: "HousekeepingTasks",
                column: "RoomId");
        }
    }
}
