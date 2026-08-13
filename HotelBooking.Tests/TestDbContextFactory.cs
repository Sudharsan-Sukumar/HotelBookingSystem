using System;
using HotelBooking.API.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;

namespace HotelBooking.Tests;

internal static class TestDbContextFactory
{
    public static ApplicationDbContext Create() => Create(Guid.NewGuid().ToString());

    // Overload for tests that need a SECOND DbContext instance pointed at the SAME in-memory
    // database (e.g. simulating two concurrent requests each with their own tracked entities).
    public static ApplicationDbContext Create(string dbName)
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(dbName)
            // Some services (e.g. GalleryService, BookingService) open a real transaction, which
            // the InMemory provider doesn't support and otherwise logs as an error-level warning.
            // Transactions are a no-op here but the surrounding code path still needs to run.
            .ConfigureWarnings(w => w.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        return new ApplicationDbContext(options);
    }
}
