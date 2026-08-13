using System;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;

namespace HotelBooking.API.Common.Services;

// Under real SQL Server lock contention (e.g. two customers racing for the last room), a deadlock
// (error 1205) surfaces from SaveChangesAsync as System.InvalidOperationException ("...consider
// enabling transient error resiliency by adding EnableRetryOnFailure...") with the actual
// DbUpdateException -> SqlException chain nested as InnerException — NOT as a DbUpdateException or
// SqlException directly. A catch filter that only checks `is DbUpdateException or SqlException`
// therefore never matches, and the raw wrapped exception falls through to any generic
// `catch (InvalidOperationException)` block, leaking driver internals in ex.Message. This checks the
// unwrapped shape without treating every InvalidOperationException as a DB failure (genuine
// business-rule InvalidOperationExceptions have no such InnerException).
public static class TransientDbFailure
{
    public static bool IsTransient(Exception ex) =>
        ex is DbUpdateException or SqlException ||
        (ex is InvalidOperationException && ex.InnerException is DbUpdateException or SqlException);
}
