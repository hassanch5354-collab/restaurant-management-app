using System;

namespace WebAPI.DTOs
{
    public class OrderListDTO
    {
        public long OrderID { get; set; }
        public string OrderNo { get; set; }
        public string Customer { get; set; }
        public DateTime? OrderDate { get; set; }
        public string PMethod { get; set; }
        public decimal GTotal { get; set; }
    }
}