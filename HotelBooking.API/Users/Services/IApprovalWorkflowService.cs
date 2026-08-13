using System.Collections.Generic;
using System.Threading.Tasks;
using HotelBooking.API.Users.DTOs;

namespace HotelBooking.API.Users.Services;

public interface IApprovalWorkflowService
{
    Task<IEnumerable<ManagerDto>> GetPendingManagersAsync();
    Task<bool> ApproveManagerAsync(int managerId, int adminId);
    Task<bool> RejectManagerAsync(int managerId, int adminId);
}
