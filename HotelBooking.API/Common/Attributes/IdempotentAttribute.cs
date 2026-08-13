using System;

namespace HotelBooking.API.Common.Attributes;

[AttributeUsage(AttributeTargets.Method, Inherited = false, AllowMultiple = false)]
public class IdempotentAttribute : Attribute
{
}
