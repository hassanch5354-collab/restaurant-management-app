using System;
using System.Web.Http;
using WebAPI.Models;
using WebAPI.Services;

namespace WebAPI.Controllers
{
    public class OrderController : ApiController
    {
        private OrderService orderService = new OrderService();

        // GET: api/Order
        [Authorize]
        [HttpGet]
        [Route("api/Order")]
        public IHttpActionResult GetOrders()
        {
            try
            {
                var orders = orderService.GetAllOrders();
                return Ok(orders);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        // GET: api/Order/5
        [Authorize]
        [HttpGet]
        [Route("api/Order/{id:long}")]
        public IHttpActionResult GetOrder(long id)
        {
            try
            {
                var order = orderService.GetOrderById(id);
                if (order == null)
                {
                    return NotFound();
                }
                return Ok(order);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        // POST: api/Order
        [Authorize]
        [HttpPost]
        [Route("api/Order")]
        public IHttpActionResult PostOrder([FromBody] Order order)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return BadRequest(ModelState);
                }

                orderService.SaveOrUpdateOrder(order);
                return Ok();
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        // DELETE: api/Order/5
        [Authorize]
        [HttpDelete]
        [Route("api/Order/{id:long}")]
        public IHttpActionResult DeleteOrder(long id)
        {
            try
            {
                orderService.DeleteOrder(id);
                return Ok();
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        // GET: api/Order/GetSalesReport
        [Authorize]
        [HttpGet]
        [Route("api/Order/GetSalesReport")]
        public IHttpActionResult GetSalesReport([FromUri] string fromDate = null, [FromUri] string toDate = null)
        {
            try
            {
                DateTime? parsedFrom = null;
                DateTime? parsedTo = null;

                if (!string.IsNullOrWhiteSpace(fromDate) && DateTime.TryParse(fromDate, out DateTime dtFrom))
                {
                    parsedFrom = dtFrom.Date;
                }

                if (!string.IsNullOrWhiteSpace(toDate) && DateTime.TryParse(toDate, out DateTime dtTo))
                {
                    parsedTo = dtTo.Date.AddDays(1).AddTicks(-1);
                }

                var report = orderService.GetSalesReportData(parsedFrom, parsedTo);
                return Ok(report);
            }
            catch (Exception ex)
            {
                return InternalServerError(ex);
            }
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing && orderService != null)
            {
                orderService.Dispose();
            }
            base.Dispose(disposing);
        }
    }
}