using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelBooking.API.Migrations
{
    /// <inheritdoc />
    public partial class Phase2SearchUpdates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsActive",
                schema: "hotel",
                table: "RoomTypes",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "TotalRooms",
                schema: "hotel",
                table: "RoomTypes",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AlterColumn<int>(
                name: "StarRating",
                schema: "hotel",
                table: "Hotels",
                type: "int",
                nullable: false,
                oldClrType: typeof(double),
                oldType: "float");

            migrationBuilder.AddColumn<string>(
                name: "HotelCustomId",
                schema: "hotel",
                table: "Hotels",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "ThumbnailUrl",
                schema: "hotel",
                table: "Hotels",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "IsActive",
                schema: "hotel",
                table: "RoomTypes");

            migrationBuilder.DropColumn(
                name: "TotalRooms",
                schema: "hotel",
                table: "RoomTypes");

            migrationBuilder.DropColumn(
                name: "HotelCustomId",
                schema: "hotel",
                table: "Hotels");

            migrationBuilder.DropColumn(
                name: "ThumbnailUrl",
                schema: "hotel",
                table: "Hotels");

            migrationBuilder.AlterColumn<double>(
                name: "StarRating",
                schema: "hotel",
                table: "Hotels",
                type: "float",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int");
        }
    }
}
