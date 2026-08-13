using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace HotelBooking.API.Migrations
{
    /// <inheritdoc />
    public partial class Phase3Bookings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "WalletBalance",
                schema: "hotel",
                table: "Users",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<bool>(
                name: "UsedWallet",
                schema: "hotel",
                table: "Payments",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<decimal>(
                name: "BaseCost",
                schema: "hotel",
                table: "Bookings",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<string>(
                name: "BookingCustomId",
                schema: "hotel",
                table: "Bookings",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "CancelledAt",
                schema: "hotel",
                table: "Bookings",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "NumberOfRooms",
                schema: "hotel",
                table: "Bookings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<int>(
                name: "RoomTypeId",
                schema: "hotel",
                table: "Bookings",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "SpecialRequests",
                schema: "hotel",
                table: "Bookings",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TaxAmount",
                schema: "hotel",
                table: "Bookings",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "WalletAmountUsed",
                schema: "hotel",
                table: "Bookings",
                type: "decimal(18,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.CreateIndex(
                name: "IX_Bookings_RoomTypeId",
                schema: "hotel",
                table: "Bookings",
                column: "RoomTypeId");

            migrationBuilder.AddForeignKey(
                name: "FK_Bookings_RoomTypes_RoomTypeId",
                schema: "hotel",
                table: "Bookings",
                column: "RoomTypeId",
                principalSchema: "hotel",
                principalTable: "RoomTypes",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Bookings_RoomTypes_RoomTypeId",
                schema: "hotel",
                table: "Bookings");

            migrationBuilder.DropIndex(
                name: "IX_Bookings_RoomTypeId",
                schema: "hotel",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "WalletBalance",
                schema: "hotel",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "UsedWallet",
                schema: "hotel",
                table: "Payments");

            migrationBuilder.DropColumn(
                name: "BaseCost",
                schema: "hotel",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "BookingCustomId",
                schema: "hotel",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "CancelledAt",
                schema: "hotel",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "NumberOfRooms",
                schema: "hotel",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "RoomTypeId",
                schema: "hotel",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "SpecialRequests",
                schema: "hotel",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "TaxAmount",
                schema: "hotel",
                table: "Bookings");

            migrationBuilder.DropColumn(
                name: "WalletAmountUsed",
                schema: "hotel",
                table: "Bookings");
        }
    }
}
