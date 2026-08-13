using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelBooking.API.Migrations
{
    /// <inheritdoc />
    public partial class AddAdminEdgeCases : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Hotels_Users_ManagerId",
                schema: "hotel",
                table: "Hotels");

            migrationBuilder.DropIndex(
                name: "IX_Hotels_ManagerId",
                schema: "hotel",
                table: "Hotels");

            migrationBuilder.DropColumn(
                name: "ManagerId",
                schema: "hotel",
                table: "Hotels");

            migrationBuilder.AddColumn<string>(
                name: "FileHash",
                schema: "hotel",
                table: "RoomTypeImages",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "hotel",
                table: "Hotels",
                type: "nvarchar(450)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(max)");

            migrationBuilder.AddColumn<byte[]>(
                name: "RowVersion",
                schema: "hotel",
                table: "Hotels",
                type: "rowversion",
                rowVersion: true,
                nullable: false,
                defaultValue: new byte[0]);

            migrationBuilder.AddColumn<string>(
                name: "Caption",
                schema: "hotel",
                table: "HotelImages",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "FileHash",
                schema: "hotel",
                table: "HotelImages",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

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

            migrationBuilder.CreateIndex(
                name: "IX_Hotels_Name_City",
                schema: "hotel",
                table: "Hotels",
                columns: new[] { "Name", "City" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_HotelManagers_UserId",
                schema: "hotel",
                table: "HotelManagers",
                column: "UserId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "HotelManagers",
                schema: "hotel");

            migrationBuilder.DropIndex(
                name: "IX_Hotels_Name_City",
                schema: "hotel",
                table: "Hotels");

            migrationBuilder.DropColumn(
                name: "FileHash",
                schema: "hotel",
                table: "RoomTypeImages");

            migrationBuilder.DropColumn(
                name: "RowVersion",
                schema: "hotel",
                table: "Hotels");

            migrationBuilder.DropColumn(
                name: "Caption",
                schema: "hotel",
                table: "HotelImages");

            migrationBuilder.DropColumn(
                name: "FileHash",
                schema: "hotel",
                table: "HotelImages");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                schema: "hotel",
                table: "Hotels",
                type: "nvarchar(max)",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(450)");

            migrationBuilder.AddColumn<int>(
                name: "ManagerId",
                schema: "hotel",
                table: "Hotels",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Hotels_ManagerId",
                schema: "hotel",
                table: "Hotels",
                column: "ManagerId");

            migrationBuilder.AddForeignKey(
                name: "FK_Hotels_Users_ManagerId",
                schema: "hotel",
                table: "Hotels",
                column: "ManagerId",
                principalSchema: "hotel",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }
    }
}
