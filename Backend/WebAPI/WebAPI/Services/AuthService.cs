using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using WebAPI.DTOs;
using WebAPI.Models;

namespace WebAPI.Services
{
    public class AuthService : IDisposable
    {
        private RestaurentDBEntities2 db = new RestaurentDBEntities2();

        public LoginResponseDto AuthenticateUser(LoginRequestDto model)
        {
            if (model == null || string.IsNullOrWhiteSpace(model.Username) || string.IsNullOrWhiteSpace(model.Password))
            {
                return null;
            }

            var permissions = new List<UserPermissionDto>();
            int userId = 0;
            string username = string.Empty;
            string roleName = string.Empty;

            var connStr = db.Database.Connection.ConnectionString;

            using (var conn = new SqlConnection(connStr))
            using (var cmd = new SqlCommand("sp_UserLoginWithPermissions", conn))
            {
                cmd.CommandType = CommandType.StoredProcedure;
                cmd.Parameters.AddWithValue("@Username", model.Username);
                cmd.Parameters.AddWithValue("@Password", model.Password);

                conn.Open();
                using (var reader = cmd.ExecuteReader())
                {
                    while (reader.Read())
                    {
                        if (userId == 0)
                        {
                            userId = Convert.ToInt32(reader["UserID"]);
                            username = reader["Username"].ToString();
                            roleName = reader["Role_Name"] != DBNull.Value ? reader["Role_Name"].ToString() : string.Empty;
                        }

                        if (reader["Permission_id"] != DBNull.Value)
                        {
                            permissions.Add(new UserPermissionDto
                            {
                                PermissionId = Convert.ToInt32(reader["Permission_id"]),
                                PermissionName = reader["Permission_Name"].ToString(),
                                Status = reader["Role_Status"] != DBNull.Value ? Convert.ToInt32(reader["Role_Status"]) : 0
                            });
                        }
                    }
                }
            }

            if (userId == 0)
            {
                return null;
            }

            DateTime expiryDateTime = DateTime.UtcNow.AddHours(8);
            var tokenString = GenerateJwtToken(userId, username, roleName, expiryDateTime);

            SaveTokenToDatabase(userId, tokenString, expiryDateTime);

            return new LoginResponseDto
            {
                Token = tokenString,
                Username = username,
                Role = roleName,
                Permissions = permissions
            };
        }

        private string GenerateJwtToken(int userId, string username, string role, DateTime expiryDateTime)
        {
            var tokenHandler = new JwtSecurityTokenHandler();
            var key = Encoding.UTF8.GetBytes(ConfigurationManager.AppSettings["JwtKey"]);

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(new[]
                {
                    new Claim(ClaimTypes.Name, username),
                    new Claim(ClaimTypes.Role, role),
                    new Claim("UserID", userId.ToString())
                }),
                Expires = expiryDateTime,
                Issuer = ConfigurationManager.AppSettings["JwtIssuer"],
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

        private void SaveTokenToDatabase(int userId, string token, DateTime expiryDateTime)
        {
            try
            {
                var pUserId = new SqlParameter("@UserID", userId);
                var pToken = new SqlParameter("@Token", token);
                var pExpiry = new SqlParameter("@ExpiryDateTime", expiryDateTime);

                db.Database.ExecuteSqlCommand(
                    "EXEC sp_SaveUserLog @UserID, @Token, @ExpiryDateTime",
                    pUserId,
                    pToken,
                    pExpiry
                );
            }
            catch (Exception ex)
            {
                System.Diagnostics.Debug.WriteLine("Log Save Error: " + ex.Message);
            }
        }

        public void Dispose()
        {
            if (db != null)
            {
                db.Dispose();
            }
        }
    }
}