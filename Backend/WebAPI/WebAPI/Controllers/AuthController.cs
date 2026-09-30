using System;
using System.Web.Http;
using WebAPI.DTOs;
using WebAPI.Services;

namespace WebAPI.Controllers
{
    public class AuthController : ApiController
    {
        private AuthService authService = new AuthService();

        [HttpPost]
        [Route("api/Auth/Login")]
        public IHttpActionResult Login([FromBody] LoginRequestDto model)
        {
            try
            {
                if (model == null || string.IsNullOrWhiteSpace(model.Username) || string.IsNullOrWhiteSpace(model.Password))
                {
                    return BadRequest("Invalid credentials.");
                }

                // All business logic has been delegated to the AuthService
                var response = authService.AuthenticateUser(model);

                if (response == null)
                {
                    return Unauthorized();
                }

                return Ok(response);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing && authService != null)
            {
                authService.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}