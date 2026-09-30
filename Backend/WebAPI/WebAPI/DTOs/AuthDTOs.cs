using System.Collections.Generic;

namespace WebAPI.DTOs
{
    public class LoginRequestDto
    {
        public string Username { get; set; }
        public string Password { get; set; }
    }

    public class UserPermissionDto
    {
        public int PermissionId { get; set; }
        public string PermissionName { get; set; }
        public int Status { get; set; }
    }

    public class LoginResponseDto
    {
        public string Token { get; set; }
        public string Username { get; set; }
        public string Role { get; set; }
        public List<UserPermissionDto> Permissions { get; set; } = new List<UserPermissionDto>();
    }
}