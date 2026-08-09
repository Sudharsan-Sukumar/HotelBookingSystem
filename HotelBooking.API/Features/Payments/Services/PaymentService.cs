using System;
using System.Linq;
using System.Threading.Tasks;
using HotelBooking.API.Data;
using HotelBooking.API.Features.Payments.DTOs;
using HotelBooking.API.Features.Payments.Models;
using HotelBooking.API.Features.Payments.Clients;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.API.Features.Payments.Services;

public class PaymentService : IPaymentService
{
    private readonly ApplicationDbContext _context;
    private readonly ExternalPaymentGatewayClient _paymentClient;

    public PaymentService(ApplicationDbContext context, ExternalPaymentGatewayClient paymentClient)
    {
        _context = context;
        _paymentClient = paymentClient;
    }

    public async Task<PaymentResponseDto> ProcessPaymentAsync(int userId, PaymentRequestDto request)
    {
        using var transaction = await _context.Database.BeginTransactionAsync();
        
        try
        {
            var booking = await _context.Bookings
                .Include(b => b.User)
                .FirstOrDefaultAsync(b => b.Id == request.BookingId && b.UserId == userId);

        if (booking == null)
            throw new ArgumentException("Booking not found.");

        if (booking.Status == "Confirmed" || booking.Status == "Cancelled")
            throw new InvalidOperationException($"Booking is already {booking.Status.ToLower()}.");

        decimal amountToPay = booking.TotalAmount - booking.WalletAmountUsed;

        if (request.AmountToPay != amountToPay && !request.UseWalletBalance)
        {
            throw new ArgumentException($"Incorrect amount. Outstanding balance is {amountToPay}.");
        }

        bool usedWallet = false;
        if (request.UseWalletBalance && booking.User.WalletBalance > 0)
        {
            if (booking.User.WalletBalance >= amountToPay)
            {
                booking.User.WalletBalance -= amountToPay;
                booking.WalletAmountUsed += amountToPay;
                amountToPay = 0;
            }
            else
            {
                booking.WalletAmountUsed += booking.User.WalletBalance;
                amountToPay -= booking.User.WalletBalance;
                booking.User.WalletBalance = 0;
            }
            usedWallet = true;
        }

        // Use ExternalPaymentGatewayClient (with Polly)
        var transactionId = $"TXN-{DateTime.UtcNow.Year}{DateTime.UtcNow.Month:D2}{DateTime.UtcNow.Day:D2}-{new Random().Next(10000, 99999)}";
        
        bool paymentSuccess = await _paymentClient.InitiatePaymentAsync(transactionId, request.AmountToPay);
        
        if (!paymentSuccess)
        {
            throw new InvalidOperationException("Payment gateway declined the transaction. Please try again.");
        }

        // Generate Booking ID (BP-10.4)
        if (string.IsNullOrEmpty(booking.BookingCustomId))
        {
            var existingIds = await _context.Bookings
                .Where(b => b.BookingCustomId != null && b.BookingCustomId != "")
                .Select(b => b.BookingCustomId)
                .ToListAsync();
            int nextSequence = existingIds
                .Select(id => int.TryParse(id.Split('-').LastOrDefault(), out var n) ? n : 0)
                .DefaultIfEmpty(0)
                .Max() + 1;
            booking.BookingCustomId = $"BKG-{DateTime.UtcNow.Year}-{nextSequence:D6}";
        }

        booking.Status = "Confirmed";

        var payment = new Payment
        {
            BookingId = booking.Id,
            Amount = request.AmountToPay,
            PaymentMethod = request.PaymentMethod,
            TransactionId = transactionId,
            Status = "Completed",
            UsedWallet = usedWallet
        };

            _context.Payments.Add(payment);
            await _context.SaveChangesAsync();
            
            await transaction.CommitAsync();

            return new PaymentResponseDto
            {
                Id = payment.Id,
                TransactionId = transactionId,
                AmountPaid = payment.Amount,
                WalletAmountUsed = booking.WalletAmountUsed,
                PaymentMethod = payment.PaymentMethod,
                Status = payment.Status,
                PaymentDate = payment.PaymentDate,
                BookingCustomId = booking.BookingCustomId
            };
        }
        catch (Exception)
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}
